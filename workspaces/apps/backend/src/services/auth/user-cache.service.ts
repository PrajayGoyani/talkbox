import { IUserRepository } from "@repositories/interfaces/user.repository";
import { IRedisBaseService } from "@services/infra/interfaces";
import { IUserCacheService } from "@services/interfaces/user-cache.service";
import { LRUCache } from "lru-cache";
import { UserDto } from "shared/types/auth.dto";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const CACHE_MAX_ENTRIES = 50000;

export class UserCacheService implements IUserCacheService {
  private cache: LRUCache<string, UserDto>;

  constructor(
    private userRepo: IUserRepository,
    private redisBaseService: IRedisBaseService,
  ) {
    this.cache = new LRUCache({
      max: CACHE_MAX_ENTRIES,
      ttl: CACHE_TTL_MS,
    });

    this.initRedisSubscription();
  }

  private initRedisSubscription() {
    if (this.redisBaseService.subClient) {
      // Subscribe to global cache invalidation
      this.redisBaseService.subClient.subscribe("cache:invalidate").catch((err: any) => {
        console.error("[UserCacheService] Failed to subscribe to Redis invalidation:", err);
      });

      this.redisBaseService.subClient.on("message", (channel: string, message: string) => {
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

  async getUser(userId: string): Promise<UserDto | null> {
    const cached = this.cache.get(userId);
    if (cached) {
      return cached;
    }

    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    const sanitized = this.userRepo.transformUser(user);

    this.cache.set(userId, sanitized);

    return sanitized;
  }

  invalidate(userId: string) {
    this.cache.delete(userId);
  }

  set(userId: string, user: UserDto) {
    this.cache.set(userId, user);
  }
}
