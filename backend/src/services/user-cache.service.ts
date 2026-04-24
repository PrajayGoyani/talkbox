import User from "@models/user.model";
import { SanitizedUser } from "@services/auth.service";
import { redisService } from "@services/redis.service";
import { LRUCache } from "lru-cache";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const CACHE_MAX_ENTRIES = 50000;

class UserCacheService {
  private cache: LRUCache<string, SanitizedUser>;

  constructor() {
    this.cache = new LRUCache({
      max: CACHE_MAX_ENTRIES,
      ttl: CACHE_TTL_MS,
    });

    this.initRedisSubscription();
  }

  private initRedisSubscription() {
    if (redisService.subClient) {
      // Subscribe to global cache invalidation
      redisService.subClient.subscribe("cache:invalidate").catch((err) => {
        console.error("[UserCacheService] Failed to subscribe to Redis invalidation:", err);
      });

      redisService.subClient.on("message", (channel, message) => {
        if (channel === "cache:invalidate") {
          try {
            const { type, id } = JSON.parse(message);
            if (type === "user") {
              this.invalidate(id);
            }
          } catch (err) {
            console.error("[UserCacheService] Error parsing cache invalidation:", err);
          }
        }
      });
    }
  }

  async getUser(userId: string): Promise<SanitizedUser | null> {
    const cached = this.cache.get(userId);
    if (cached) {
      return cached;
    }

    const user = await User.findById(userId);
    if (!user) return null;

    const sanitized: SanitizedUser = {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isEmailVerified: user.isEmailVerified ?? false,
    };

    this.cache.set(userId, sanitized);

    return sanitized;
  }

  invalidate(userId: string) {
    this.cache.delete(userId);
  }

  set(userId: string, user: SanitizedUser) {
    this.cache.set(userId, user);
  }
}

export const userCacheService = new UserCacheService();
