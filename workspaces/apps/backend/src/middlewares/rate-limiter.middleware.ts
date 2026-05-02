import { RATE_LIMIT_DEFAULT_MAX, RATE_LIMIT_DEFAULT_WINDOW_MS } from "@config/env";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { NextFunction, Request, Response } from "express";
import { LRUCache } from "lru-cache";

interface RateLimitState {
  count: number;
  resetAt: number;
}

/**
 * Hybrid Rate Limiter:
 * L1: Local LRU cache to block repeat offenders without hitting Redis.
 * L2: Global Redis counter for distributed synchronization.
 */

// L1: Local cache for users who are already blocked (suppression)
const localBlockCache = new LRUCache<string, boolean>({
  max: 10000,
  ttl: 10000, // Default 10s local block suppression
});

/**
 * Factory to create rate limiters with custom thresholds.
 */
export const createRateLimiter = (
  maxRequests: number = RATE_LIMIT_DEFAULT_MAX,
  windowMs: number = RATE_LIMIT_DEFAULT_WINDOW_MS,
  prefix: string = "rl",
) => {
  // L1: Local counter for fail-through protection and windowing
  const localFallbackCounts = new LRUCache<string, RateLimitState>({
    max: 10000,
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
    const now = Date.now();

    // 1. Check L1 suppression (Is the user already known to be blocked?)
    if (localBlockCache.get(localKey)) {
      res.set("X-RateLimit-Limit", maxRequests.toString());
      res.set("X-RateLimit-Remaining", "0");
      return next(
        AppError.tooMany(
          `Strict limit of ${maxRequests} requests per ${windowMs / 1000}s exceeded. (L1)`,
          "RATE_LIMIT_EXCEEDED",
        ),
      );
    }

    // 2. Track count locally (Fail-through Protection)
    let state = localFallbackCounts.get(localKey);

    // If no state or window has passed, reset the local window
    if (!state || state.resetAt <= now) {
      state = { count: 1, resetAt: now + windowMs };
    } else {
      state.count++;
    }
    localFallbackCounts.set(localKey, state);

    // 3. Early local block (Fail-through)
    if (state.count > maxRequests) {
      // Suppress locally for the remainder of the window (up to 10s max)
      const suppressionTtl = Math.min(10000, state.resetAt - now);
      localBlockCache.set(localKey, true, { ttl: suppressionTtl });

      res.set("X-RateLimit-Limit", maxRequests.toString());
      res.set("X-RateLimit-Remaining", "0");
      res.set("X-RateLimit-Reset", Math.ceil(state.resetAt / 1000).toString());

      return next(
        AppError.tooMany(
          `Strict limit of ${maxRequests} requests per ${windowMs / 1000}s exceeded. (Local)`,
          "RATE_LIMIT_EXCEEDED",
        ),
      );
    }

    // 4. Check L2: Global Redis Counter
    if (redisService.client && redisService.isConnected) {
      try {
        const rl = await redisService.incrementAndCheckLimit(redisKey, maxRequests, windowMs);

        // Sync local state with Redis "truth"
        state.count = rl.current;
        state.resetAt = now + rl.ttl;
        localFallbackCounts.set(localKey, state);

        res.set("X-RateLimit-Limit", maxRequests.toString());
        res.set("X-RateLimit-Remaining", Math.max(0, maxRequests - rl.current).toString());
        res.set("X-RateLimit-Reset", Math.ceil(state.resetAt / 1000).toString());

        if (!rl.allowed) {
          // Block locally to save Redis calls for the remainder of this burst
          const suppressionTtl = Math.min(10000, rl.ttl);
          localBlockCache.set(localKey, true, { ttl: suppressionTtl });

          return next(
            AppError.tooMany(
              `Strict limit of ${maxRequests} requests per ${windowMs / 1000}s exceeded.`,
              "RATE_LIMIT_EXCEEDED",
            ),
          );
        }
      } catch (err) {
        console.error("[RateLimiter] Redis error, falling back to local:", err);
        // Fallback: headers from local state
        res.set("X-RateLimit-Limit", maxRequests.toString());
        res.set("X-RateLimit-Remaining", Math.max(0, maxRequests - state.count).toString());
        res.set("X-RateLimit-Reset", Math.ceil(state.resetAt / 1000).toString());
      }
    } else {
      // Redis is down: headers from local state
      res.set("X-RateLimit-Limit", maxRequests.toString());
      res.set("X-RateLimit-Remaining", Math.max(0, maxRequests - state.count).toString());
      res.set("X-RateLimit-Reset", Math.ceil(state.resetAt / 1000).toString());
    }

    next();
  };
};

// Default global rate limiter (100/min)
export const rateLimiter = createRateLimiter();
