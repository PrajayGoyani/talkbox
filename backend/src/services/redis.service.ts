import { REDIS_URL } from "@config/env";
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

  async setUserOffline(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.srem("online_users", userId);
      // Notify all server instances via Pub/Sub
      await this.client.publish("presence:updates", JSON.stringify({ userId, isOnline: false }));
    } catch (err) {
      console.error("[RedisService] Error setting user offline:", err);
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
          .expire(key, 86400) // 1 day safety TTL
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

  async publishCacheInvalidation(type: "user" | "partner", id: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.publish("cache:invalidate", JSON.stringify({ type, id }));
    } catch (err) {
      console.error("[RedisService] Error publishing cache invalidation:", err);
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
}

export const redisService = new RedisService();
