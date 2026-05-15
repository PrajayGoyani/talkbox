export * from "./redis/base";
export * from "./redis/presence";
export * from "./redis/session";
export * from "./redis/guard";

import { registry } from "@bootstrap/registry";

export const baseService = registry.redisBaseService;
export const redisPresenceService = registry.redisPresenceService;
export const redisSessionService = registry.redisSessionService;
export const redisGuardService = registry.redisGuardService;
