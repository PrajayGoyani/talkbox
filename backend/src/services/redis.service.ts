import { REDIS_URL } from "@config/env";
import * as Sentry from "@sentry/bun";
import { Redis } from "ioredis";

/**
 * Key Patterns:
 * - partners:userId (Set of partner User IDs)
 * - online_users (Set of currently online User IDs)
 * - sessions:userId (Set of active Socket IDs for this user)
 */
class RedisService {
  public client: Redis | null = null;
  public subClient: Redis | null = null;
  public isConnected = false;
  private lastFailOpenLogAt = 0;
  private failOpenCount = 0;
  private readonly FAIL_OPEN_LOG_INTERVAL = 60 * 1000; // Log at most once per minute after threshold
  private readonly FAIL_OPEN_ALERT_THRESHOLD = 5; // Alert on first 5 failures instantly

  constructor() {
    if (!REDIS_URL) {
      console.warn("[RedisService] REDIS_URL not provided. Redis features will be disabled.");
      return;
    }

    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        reconnectOnError: (err) => {
          const targetError = "READONLY";
          if (err.message.includes(targetError)) return true;
          return false;
        },
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        this.failOpenCount = 0;
        console.log("[RedisService] Connected to Redis.");
      });

      this.client.on("error", (err) => {
        console.error("[RedisService] Redis Client Error:", err);
      });

      // Dedicated subscription client
      this.subClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
      });
    } catch (err) {
      console.error("[RedisService] Failed to initialize Redis:", err);
    }
  }

  // ─── Partner Caching (L2) ──────────────────────────────────────────

  async getCachedPartners(userId: string, activeOnly = false): Promise<Set<string> | null> {
    if (!this.client || !this.isConnected) return null;
    const key = activeOnly ? `partners:${userId}:active` : `partners:${userId}`;
    try {
      const partners = await this.client.smembers(key);
      return partners.length > 0 ? new Set(partners) : null;
    } catch (err) {
      console.error("[RedisService] Error getting cached partners:", err);
      return null;
    }
  }

  async setCachedPartners(userId: string, partnerIds: string[], activeOnly = false): Promise<void> {
    if (!this.client || !this.isConnected || partnerIds.length === 0) return;
    const key = activeOnly ? `partners:${userId}:active` : `partners:${userId}`;
    try {
      await this.client
        .multi()
        .del(key)
        .sadd(key, ...partnerIds)
        .expire(key, 1800)
        .exec(); // 30 mins TTL
    } catch (err) {
      console.error("[RedisService] Error setting cached partners:", err);
    }
  }

  async invalidatePartnerCache(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`partners:${userId}`, `partners:${userId}:active`);
    } catch (err) {
      console.error("[RedisService] Error invalidating partner cache:", err);
    }
  }

  // ─── Presence Tracking (Global) ────────────────────────────────────

  async setUserOnline(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.sadd("online_users", userId);
      // Notify all server instances via Pub/Sub
      await this.client.publish("presence:updates", JSON.stringify({ userId, isOnline: true }));
    } catch (err) {
      console.error("[RedisService] Error setting user online:", err);
    }
  }

  async setUserOffline(userId: string, lastSeen: Date = new Date()): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client
        .multi()
        .srem("online_users", userId)
        .set(`user:ls:${userId}`, lastSeen.toISOString(), "EX", 604800) // 7-day TTL auto-pruning
        .exec();

      // Notify all server instances via Pub/Sub
      await this.client.publish("presence:updates", JSON.stringify({ userId, isOnline: false }));
    } catch (err) {
      console.error("[RedisService] Error setting user offline:", err);
    }
  }

  async getLastSeenBatched(userIds: string[]): Promise<Map<string, Date>> {
    if (!this.client || !this.isConnected || userIds.length === 0) return new Map();
    try {
      const keys = userIds.map((id) => `user:ls:${id}`);
      const results = await this.client.mget(...keys);
      const lastSeenMap = new Map<string, Date>();

      results.forEach((val, index) => {
        if (val) {
          lastSeenMap.set(userIds[index], new Date(val));
        }
      });

      return lastSeenMap;
    } catch (err) {
      console.error("[RedisService] Error getting batched last seen:", err);
      return new Map();
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      return (await this.client.sismember("online_users", userId)) === 1;
    } catch (err) {
      console.error("[RedisService] Error checking user online:", err);
      return false;
    }
  }

  async getOnlineUsers(userIds: string[]): Promise<Set<string>> {
    if (!this.client || !this.isConnected || userIds.length === 0) return new Set();
    try {
      // Find intersection of requested users and online users
      // Optimization: use SINTER if we can create a temp set, but for small batches pipeline is safer
      const pipeline = this.client.pipeline();
      userIds.forEach((id) => pipeline.sismember("online_users", id));
      const results = await pipeline.exec();

      const online = new Set<string>();
      results?.forEach((res, index) => {
        const [err, isMember] = res;
        if (!err && isMember === 1) online.add(userIds[index]);
      });
      return online;
    } catch (err) {
      console.error("[RedisService] Error getting online users:", err);
      return new Set();
    }
  }

  // ─── Global Session Tracking ───────────────────────────────────────

  async incrementGlobalSession(userId: string, socketId: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      const key = `sessions:${userId}`;
      const results =
        (await this.client
          .multi()
          .sadd(key, socketId)
          .scard(key)
          .expire(key, 3600) // 1 hour safety TTL (refreshed on interaction)
          .exec()) || [];

      // Results are [ [err, res], [err, res], ... ]
      const cardRes = results[1];
      return cardRes ? (cardRes[1] as number) : 0;
    } catch (err) {
      console.error("[RedisService] Error incrementing global session:", err);
      return 0;
    }
  }

  async decrementGlobalSession(userId: string, socketId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.srem(`sessions:${userId}`, socketId);
    } catch (err) {
      console.error("[RedisService] Error decrementing global session:", err);
    }
  }

  async getGlobalSessionCount(userId: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      return await this.client.scard(`sessions:${userId}`);
    } catch (err) {
      console.error("[RedisService] Error getting global session count:", err);
      return 0;
    }
  }

  async publishSessionTakeover(userId: string, triggerSocketId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.publish("session:takeover", JSON.stringify({ userId, triggerSocketId }));
    } catch (err) {
      console.error("[RedisService] Error publishing session takeover:", err);
    }
  }

  // ─── Cache Invalidation ────────────────────────────────────────────

  async publishCacheInvalidation(type: "user" | "partner" | "chat", id: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.publish("cache:invalidate", JSON.stringify({ type, id }));
    } catch (err) {
      console.error("[RedisService] Error publishing cache invalidation:", err);
    }
  }

  // ─── Chat Lockdown (Global) ────────────────────────────────────────

  async lockChat(chatId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.sadd("lockdown:chats", chatId);
    } catch (err) {
      console.error("[RedisService] Error locking chat:", err);
    }
  }

  async unlockChat(chatId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.srem("lockdown:chats", chatId);
    } catch (err) {
      console.error("[RedisService] Error unlocking chat:", err);
    }
  }

  async isChatLocked(chatId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      return (await this.client.sismember("lockdown:chats", chatId)) === 1;
    } catch (err) {
      console.error("[RedisService] Error checking chat lockdown:", err);
      return false;
    }
  }

  // ─── Rate Limiting (Global) ────────────────────────────────────────

  /**
   * Atomic increment and check for a rate limit key.
   * Returns true if the limit has NOT been exceeded.
   */
  async incrementAndCheckLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      this._logFailOpen("incrementAndCheckLimit");
      return true; // Fail open if Redis is down
    }
    try {
      const results =
        (await this.client
          .multi()
          .incr(key)
          .expire(key, Math.ceil(windowMs / 1000), "NX")
          .exec()) || [];

      const incrRes = results[0];
      const count = incrRes ? (incrRes[1] as number) : 0;
      return count <= limit;
    } catch (err) {
      console.error("[RedisService] Error incrementing rate limit counter:", err);
      return true; // Fail open
    }
  }

  /**
   * Atomic check-and-set for idempotency keys.
   * Returns true if the key did NOT exist (request is new).
   * Returns false if the key already existed (duplicate request).
   */
  async checkAndSetIdempotency(key: string, ttlSeconds = 900): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      this._logFailOpen("checkAndSetIdempotency");
      return true; // Fail open (allow DB fallback)
    }
    try {
      // "NX" = Only set if it doesn't exist. "EX" = Set expiration.
      const res = await this.client.set(`idempotency:${key}`, "1", "EX", ttlSeconds, "NX");
      return res === "OK";
    } catch (err) {
      console.error("[RedisService] Error checking idempotency key:", err);
      return true; // Fail open (allow DB fallback)
    }
  }

  // ─── Presence Sync Queue ──────────────────────────────────────────

  async queuePresenceSync(userId: string): Promise<void> {
    return this.queuePresenceSyncBatched([userId]);
  }

  async queuePresenceSyncBatched(userIds: string[]): Promise<void> {
    if (!this.client || !this.isConnected || userIds.length === 0) return;
    try {
      await this.client.sadd("presence_sync_queue", ...userIds);
    } catch (err) {
      console.error("[RedisService] Error queuing presence sync batch:", err);
    }
  }

  async getSyncQueueCount(): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      return await this.client.scard("presence_sync_queue");
    } catch {
      return 0;
    }
  }

  async popSyncQueue(limit: number): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];
    try {
      return await this.client.spop("presence_sync_queue", limit);
    } catch (err) {
      console.error("[RedisService] Error popping sync queue:", err);
      return [];
    }
  }

  // ─── Ephemeral Token Management ────────────────────────────────────

  /**
   * Store a token mapping to a userId with auto-expiry.
   * Used for password reset and email verification flows.
   */
  async storeToken(prefix: string, token: string, userId: string, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.set(`${prefix}:${token}`, userId, "EX", ttlSeconds);
    } catch (err) {
      console.error(`[RedisService] Error storing ${prefix} token:`, err);
    }
  }

  /**
   * Retrieve the userId associated with a token.
   * Returns null if expired or not found.
   */
  async getToken(prefix: string, token: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(`${prefix}:${token}`);
    } catch (err) {
      console.error(`[RedisService] Error getting ${prefix} token:`, err);
      return null;
    }
  }

  /**
   * Delete a token (e.g. after successful password reset or verification).
   */
  async deleteToken(prefix: string, token: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`${prefix}:${token}`);
    } catch (err) {
      console.error(`[RedisService] Error deleting ${prefix} token:`, err);
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────

  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      if (this.subClient) {
        await this.subClient.quit();
        this.subClient = null;
      }
      this.isConnected = false;
      console.log("[RedisService] Redis connections closed.");
    } catch (err) {
      console.error("[RedisService] Error during Redis cleanup:", err);
    }
  }

  private _logFailOpen(operation: string) {
    this.failOpenCount++;
    const now = Date.now();

    // Strategy: Alert on every failure for the first few (to catch intermittent issues)
    // then throttle to once per minute to avoid spamming Sentry during total outages.
    const shouldAlert =
      this.failOpenCount <= this.FAIL_OPEN_ALERT_THRESHOLD ||
      now - this.lastFailOpenLogAt > this.FAIL_OPEN_LOG_INTERVAL;

    if (shouldAlert) {
      if (this.failOpenCount > this.FAIL_OPEN_ALERT_THRESHOLD) {
        this.lastFailOpenLogAt = now;
      }

      Sentry.captureMessage(
        `[RedisService] Fail-open: Redis is disconnected during ${operation} (Total failures: ${this.failOpenCount})`,
        {
          level: "warning",
          tags: { service: "redis", operation: "fail-open", source: operation },
          extra: { totalFailures: this.failOpenCount },
        },
      );
    }
  }
}

export const redisService = new RedisService();
