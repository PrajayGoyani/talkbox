import { IRedisGuardService } from "../interfaces";
import { RedisBaseService } from "./base";

export class RedisGuardService implements IRedisGuardService {
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
    if (!this.client || !this.isConnected) {
      console.warn(`[RedisGuardService] Redis disconnected. Failing open for chat lockdown check: ${chatId}`);
      return false;
    }
    try {
      return (await this.client.sismember("lockdown:chats", chatId)) === 1;
    } catch (err) {
      console.error("[RedisGuardService] Error checking chat lockdown:", err);
      return false;
    }
  }

  // ─── Token Blacklist (Logout) ─────────────────────────────────────

  async blacklistToken(token: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn("[RedisGuardService] Redis disconnected. Token blacklist skipped.");
      return;
    }
    try {
      // Decode token to get expiration time
      const decoded = require("jsonwebtoken").decode(token) as { exp?: number };
      if (!decoded || !decoded.exp) {
        console.warn("[RedisGuardService] Unable to decode token or extract expiration.");
        return;
      }

      // Calculate TTL (time until token expiration in seconds)
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(1, decoded.exp - now);

      // Add token to blacklist set with TTL
      await this.client.setex(`blacklist:${token}`, ttl, "1");
    } catch (err) {
      console.error("[RedisGuardService] Error blacklisting token:", err);
      // Don't throw - logout should succeed even if blacklist fails
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn("[RedisGuardService] Redis disconnected. Token blacklist check skipped.");
      return false;
    }
    try {
      return (await this.client.exists(`blacklist:${token}`)) === 1;
    } catch (err) {
      console.error("[RedisGuardService] Error checking token blacklist:", err);
      return false;
    }
  }

  // ─── Rate Limiting (Global) ────────────────────────────────────────

  async incrementAndCheckLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; current: number; ttl: number; remaining?: number }> {
    if (!this.client || !this.isConnected) {
      // Fail open: if redis is down, we allow the request to proceed to ensure app availability.
      console.warn(`[RedisGuardService] Redis disconnected. Failing open for rate limit key: ${key}`);
      return { allowed: true, current: 0, ttl: windowMs, remaining: 0 };
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
      // Fail open
      console.warn(`[RedisGuardService] Error occurred. Failing open for rate limit key: ${key}`);
      return { allowed: true, current: 0, ttl: windowMs };
    }
  }

  async checkAndSetIdempotency(key: string, ttlSeconds = 900): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn(`[RedisGuardService] Redis disconnected. Failing open for idempotency key: ${key}`);
      return true; // Fail open
    }
    try {
      const res = await this.client.set(`idempotency:${key}`, "1", "EX", ttlSeconds, "NX");
      return res === "OK";
    } catch (err) {
      console.error("[RedisGuardService] Error checking idempotency key:", err);
      console.warn(`[RedisGuardService] Error occurred. Failing open for idempotency key: ${key}`);
      return true; // Fail open
    }
  }
}
