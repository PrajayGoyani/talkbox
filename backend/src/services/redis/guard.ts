import { RedisBaseService } from "./base";

export class RedisGuardService {
  constructor(private base: RedisBaseService) {}

  private get client() {
    return this.base.client;
  }
  private get isConnected() {
    return this.base.isConnected;
  }

  // ─── Chat Lockdown (Global) ────────────────────────────────────────

  async lockChat(chatId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.sadd("lockdown:chats", chatId);
    } catch (err) {
      console.error("[RedisGuardService] Error locking chat:", err);
    }
  }

  async unlockChat(chatId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.srem("lockdown:chats", chatId);
    } catch (err) {
      console.error("[RedisGuardService] Error unlocking chat:", err);
    }
  }

  async isChatLocked(chatId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      return (await this.client.sismember("lockdown:chats", chatId)) === 1;
    } catch (err) {
      console.error("[RedisGuardService] Error checking chat lockdown:", err);
      return false;
    }
  }

  // ─── Rate Limiting (Global) ────────────────────────────────────────

  async incrementAndCheckLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; current: number; ttl: number }> {
    if (!this.client || !this.isConnected) {
      // Logic for fail-open is handled in the facade/base if needed,
      // but here we just return safe defaults.
      return { allowed: true, current: 0, ttl: windowMs };
    }
    try {
      const results =
        (await this.client
          .multi()
          .incr(key)
          .expire(key, Math.ceil(windowMs / 1000), "NX")
          .pttl(key)
          .exec()) || [];
      const incrRes = results[0];
      const count = incrRes && !incrRes[0] ? (incrRes[1] as number) : 0;
      const pttlRes = results[2];
      const ttl = pttlRes && !pttlRes[0] ? (pttlRes[1] as number) : windowMs;
      return {
        allowed: count <= limit,
        current: count,
        ttl: ttl > 0 ? ttl : windowMs,
      };
    } catch (err) {
      console.error("[RedisGuardService] Error incrementing rate limit counter:", err);
      return { allowed: true, current: 0, ttl: windowMs };
    }
  }

  async checkAndSetIdempotency(key: string, ttlSeconds = 900): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return true; // Fail open
    }
    try {
      const res = await this.client.set(`idempotency:${key}`, "1", "EX", ttlSeconds, "NX");
      return res === "OK";
    } catch (err) {
      console.error("[RedisGuardService] Error checking idempotency key:", err);
      return true; // Fail open
    }
  }
}
