import { RedisBaseService } from "./base";

export class RedisSessionService {
  constructor(private base: RedisBaseService) {}

  private get client() {
    return this.base.client;
  }
  private get isConnected() {
    return this.base.isConnected;
  }

  // ─── Global Session Tracking ───────────────────────────────────────

  async incrementGlobalSession(userId: string, socketId: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      const key = `sessions:${userId}`;
      const results = (await this.client.multi().sadd(key, socketId).scard(key).expire(key, 3600).exec()) || [];
      const cardRes = results[1];
      return cardRes ? (cardRes[1] as number) : 0;
    } catch (err) {
      console.error("[RedisSessionService] Error incrementing global session:", err);
      return 0;
    }
  }

  async decrementGlobalSession(userId: string, socketId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.srem(`sessions:${userId}`, socketId);
    } catch (err: any) {
      if (err.message?.includes("closed")) return;
      console.error("[RedisSessionService] Error decrementing global session:", err);
    }
  }

  async getGlobalSessionCount(userId: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      return await this.client.scard(`sessions:${userId}`);
    } catch (err) {
      console.error("[RedisSessionService] Error getting global session count:", err);
      return 0;
    }
  }

  async takeoverFreeSession(userId: string, newSocketId: string): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];
    try {
      const key = `sessions:${userId}`;
      const script = `
        local key = KEYS[1]
        local new_id = ARGV[1]
        local old_ids = redis.call('SMEMBERS', key)
        local victims = {}
        for _, id in ipairs(old_ids) do
          if id ~= new_id then
            table.insert(victims, id)
          end
        end
        redis.call('DEL', key)
        redis.call('SADD', key, new_id)
        redis.call('EXPIRE', key, 3600)
        return victims
      `;
      return (await this.client.eval(script, 1, key, newSocketId)) as string[];
    } catch (err) {
      console.error("[RedisSessionService] Error during session takeover:", err);
      return [];
    }
  }

  async publishSessionTakeover(userId: string, victimSocketId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.publish("session:takeover", JSON.stringify({ userId, victimSocketId }));
    } catch (err) {
      console.error("[RedisSessionService] Error publishing session takeover:", err);
    }
  }

  // ─── Cache Invalidation ────────────────────────────────────────────

  async publishCacheInvalidation(type: "user" | "partner" | "chat", id: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.publish("cache:invalidate", JSON.stringify({ type, id }));
    } catch (err) {
      console.error("[RedisSessionService] Error publishing cache invalidation:", err);
    }
  }

  // ─── Ephemeral Token Management ────────────────────────────────────

  async storeToken(prefix: string, token: string, userId: string, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.set(`${prefix}:${token}`, userId, "EX", ttlSeconds);
    } catch (err) {
      console.error(`[RedisSessionService] Error storing ${prefix} token:`, err);
    }
  }

  async getToken(prefix: string, token: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(`${prefix}:${token}`);
    } catch (err) {
      console.error(`[RedisSessionService] Error getting ${prefix} token:`, err);
      return null;
    }
  }

  async deleteToken(prefix: string, token: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`${prefix}:${token}`);
    } catch (err) {
      console.error(`[RedisSessionService] Error deleting ${prefix} token:`, err);
    }
  }
}
