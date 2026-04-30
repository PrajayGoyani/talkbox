import { RedisBaseService } from "./base";

export class RedisPresenceService {
  constructor(private base: RedisBaseService) {}

  private get client() {
    return this.base.client;
  }
  private get isConnected() {
    return this.base.isConnected;
  }

  // ─── Partner Caching (L2) ──────────────────────────────────────────

  async getCachedPartners(userId: string, activeOnly = false): Promise<Set<string> | null> {
    if (!this.client || !this.isConnected) return null;
    const key = activeOnly ? `partners:${userId}:active` : `partners:${userId}`;
    try {
      const partners = await this.client.smembers(key);
      return partners.length > 0 ? new Set(partners) : null;
    } catch (err) {
      console.error("[RedisPresenceService] Error getting cached partners:", err);
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
        .exec();
    } catch (err) {
      console.error("[RedisPresenceService] Error setting cached partners:", err);
    }
  }

  async invalidatePartnerCache(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`partners:${userId}`, `partners:${userId}:active`);
    } catch (err) {
      console.error("[RedisPresenceService] Error invalidating partner cache:", err);
    }
  }

  // ─── Presence Tracking (Global) ────────────────────────────────────

  async setUserOnline(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.sadd("online_users", userId);
      await this.client.publish("presence:updates", JSON.stringify({ userId, isOnline: true }));
    } catch (err) {
      console.error("[RedisPresenceService] Error setting user online:", err);
    }
  }

  async setUserOffline(userId: string, lastSeen: Date = new Date()): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client
        .multi()
        .srem("online_users", userId)
        .set(`user:ls:${userId}`, lastSeen.toISOString(), "EX", 604800)
        .exec();
      await this.client.publish("presence:updates", JSON.stringify({ userId, isOnline: false }));
    } catch (err) {
      console.error("[RedisPresenceService] Error setting user offline:", err);
    }
  }

  async getLastSeenBatched(userIds: string[]): Promise<Map<string, Date>> {
    if (!this.client || !this.isConnected || userIds.length === 0) return new Map();
    try {
      const keys = userIds.map((id) => `user:ls:${id}`);
      const results = await this.client.mget(...keys);
      const lastSeenMap = new Map<string, Date>();
      results.forEach((val, index) => {
        if (val) lastSeenMap.set(userIds[index], new Date(val));
      });
      return lastSeenMap;
    } catch (err) {
      console.error("[RedisPresenceService] Error getting batched last seen:", err);
      return new Map();
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      return (await this.client.sismember("online_users", userId)) === 1;
    } catch (err) {
      console.error("[RedisPresenceService] Error checking user online:", err);
      return false;
    }
  }

  async getOnlineUsers(userIds: string[]): Promise<Set<string>> {
    if (!this.client || !this.isConnected || userIds.length === 0) return new Set();
    try {
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
      console.error("[RedisPresenceService] Error getting online users:", err);
      return new Set();
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
      console.error("[RedisPresenceService] Error queuing presence sync batch:", err);
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
      console.error("[RedisPresenceService] Error popping sync queue:", err);
      return [];
    }
  }
}
