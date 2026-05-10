import { RedisBaseService } from "./redis/base";
import { RedisGuardService } from "./redis/guard";
import { RedisPresenceService } from "./redis/presence";
import { RedisSessionService } from "./redis/session";

export const baseService = new RedisBaseService();
export const redisPresenceService = new RedisPresenceService(baseService);
export const redisSessionService = new RedisSessionService(baseService);
export const redisGuardService = new RedisGuardService(baseService);


