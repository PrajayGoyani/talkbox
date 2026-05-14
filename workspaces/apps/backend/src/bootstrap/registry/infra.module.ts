import { ImageService } from "@services/infra/image.service";
import { RedisBaseService } from "@services/infra/redis/base";
import { RedisGuardService } from "@services/infra/redis/guard";
import { RedisPresenceService } from "@services/infra/redis/presence";
import { RedisSessionService } from "@services/infra/redis/session";

import { lazy } from "./lazy";

export class InfraModule {
  constructor() {
    lazy(this, "redisBaseService", () => new RedisBaseService());
    lazy(this, "redisPresenceService", () => new RedisPresenceService(this.redisBaseService));
    lazy(this, "redisSessionService", () => new RedisSessionService(this.redisBaseService));
    lazy(this, "redisGuardService", () => new RedisGuardService(this.redisBaseService));
    lazy(this, "imageService", () => new ImageService());
  }

  declare redisBaseService: RedisBaseService;
  declare redisPresenceService: RedisPresenceService;
  declare redisSessionService: RedisSessionService;
  declare redisGuardService: RedisGuardService;
  declare imageService: ImageService;
}
