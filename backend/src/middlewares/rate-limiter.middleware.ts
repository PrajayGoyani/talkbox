import { RATE_LIMIT_DEFAULT_MAX, RATE_LIMIT_DEFAULT_WINDOW_MS } from "@config/env";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { NextFunction, Request, Response } from "express";
import { LRUCache } from "lru-cache";

/**
 * Hybrid Rate Limiter:
 * L1: Local LRU cache to block repeat offenders without hitting Redis.
 * L2: Global Redis counter for distributed synchronization.
 */

const L1_BLOCK_TTL = 10 * 1000; // Block locally for 10s if over limit

// L1: Local cache for users who are already blocked
const localBlockCache = new LRUCache<string, boolean>({
  max: 10000,
  ttl: L1_BLOCK_TTL,
});

/**
 * Factory to create rate limiters with custom thresholds.
 */
export const createRateLimiter = (
  maxRequests: number = RATE_LIMIT_DEFAULT_MAX,
  windowMs: number = RATE_LIMIT_DEFAULT_WINDOW_MS,
  prefix: string = "rl",
) => {
  // L1: Local best-effort fallback if Redis is down
  const localFallbackCounts = new LRUCache<string, number>({
    max: 10000,
    ttl: windowMs,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    // For Auth routes, we might not have a userId yet, so we use IP
    const identifier = req.user?.id || req.ip;
    if (!identifier) {
      return next();
    }

    // Use a composite key to avoid collisions between different limiters
    const localKey = `${prefix}:${identifier}`;
    const redisKey = `${prefix}:user:${identifier}`;

    // 1. Check L1: Is the user already blocked locally?
    if (localBlockCache.get(localKey)) {
      return next(
        AppError.tooMany(
          `Strict limit of ${maxRequests} requests per ${windowMs / 1000}s exceeded. (L1)`,
          "RATE_LIMIT_EXCEEDED",
        ),
      );
    }

    // 2. Track count locally (Fail-through Protection)
    // We increment this ALWAYS to have a local best-effort defense.
    const localCount = (localFallbackCounts.get(localKey) || 0) + 1;
    localFallbackCounts.set(localKey, localCount);

    if (localCount > maxRequests) {
      // Mark as blocked to save local counting overhead for a while
      localBlockCache.set(localKey, true);
      return next(
        AppError.tooMany(
          `Strict limit of ${maxRequests} requests per ${windowMs / 1000}s exceeded. (Local)`,
          "RATE_LIMIT_EXCEEDED",
        ),
      );
    }

    // 3. Check L2: Global Redis Counter
    if (redisService.client && redisService.isConnected) {
      try {
        const isAllowed = await redisService.incrementAndCheckLimit(redisKey, maxRequests, windowMs);

        if (!isAllowed) {
          // Block locally to save Redis calls for next 10s
          localBlockCache.set(localKey, true);
          return next(
            AppError.tooMany(
              `Strict limit of ${maxRequests} requests per ${windowMs / 1000}s exceeded.`,
              "RATE_LIMIT_EXCEEDED",
            ),
          );
        }
      } catch (err) {
        console.error("[RateLimiter] Redis error, falling back to local:", err);
        // We already checked the local limit above, so we can just proceed.
      }
    }

    next();
  };
};

// Default global rate limiter (100/min)
export const rateLimiter = createRateLimiter();
