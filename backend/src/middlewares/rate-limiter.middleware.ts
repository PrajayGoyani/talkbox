import { Request, Response, NextFunction } from "express";
import { LRUCache } from "lru-cache";

import { redisService } from "../services/redis.service";
import { AppError } from "../utils/AppError";

/**
 * Hybrid Rate Limiter:
 * L1: Local LRU cache to block repeat offenders without hitting Redis.
 * L2: Global Redis counter for distributed synchronization.
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;
const L1_BLOCK_TTL = 10 * 1000; // Block locally for 10s if over limit

// L1: Local cache for users who are already blocked
const localBlockCache = new LRUCache<string, boolean>({
  max: 10000,
  ttl: L1_BLOCK_TTL,
});

// L1: Local best-effort fallback if Redis is down
const localFallbackCounts = new LRUCache<string, number>({
  max: 10000,
  ttl: WINDOW_MS,
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return next();
  }

  // 1. Check L1: Is the user already blocked locally?
  if (localBlockCache.get(userId)) {
    return next(
      AppError.tooMany("Strict limit of 100 requests per 1-minute window exceeded. (L1)", "RATE_LIMIT_EXCEEDED"),
    );
  }

  // 2. Check L2: Global Redis Counter
  if (redisService.client && redisService.isConnected) {
    const key = `rl:user:${userId}`;
    try {
      // Atomic increment and set expiry if new
      const [incrRes] =
        (await redisService.client
          .multi()
          .incr(key)
          .expire(key, WINDOW_MS / 1000, "NX")
          .exec()) || [];

      const count = incrRes ? (incrRes[1] as number) : 0;

      if (count > MAX_REQUESTS) {
        // Block locally to save Redis calls for next 10s
        localBlockCache.set(userId, true);
        return next(
          AppError.tooMany("Strict limit of 100 requests per 1-minute window exceeded.", "RATE_LIMIT_EXCEEDED"),
        );
      }

      return next();
    } catch (err) {
      console.error("[RateLimiter] Redis error, falling back to local:", err);
      // Fall through to local fallback
    }
  }

  // 3. Fallback: Local best-effort tracking if Redis is missing/dead
  const currentCount = (localFallbackCounts.get(userId) || 0) + 1;
  localFallbackCounts.set(userId, currentCount);

  if (currentCount > MAX_REQUESTS) {
    return next(
      AppError.tooMany("Strict limit of 100 requests per 1-minute window exceeded. (Fallback)", "RATE_LIMIT_EXCEEDED"),
    );
  }

  next();
};
