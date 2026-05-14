export * from "./redis/base";
export * from "./redis/presence";
export * from "./redis/session";
export * from "./redis/guard";

// Placeholder singletons for legacy tests.
// These are not used by the application Registry.
export const baseService = new Proxy({} as any, {
  get: (target, prop) => {
    if (prop === "isConnected") return false;
    if (prop === "then") return target[prop];
    return target[prop];
  },
  has: (target, prop) => true,
});
export const redisPresenceService = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === "string" && prop !== "then") return () => {};
    return target[prop];
  },
  has: (target, prop) => true,
});
export const redisSessionService = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === "string" && prop !== "then") return () => {};
    return target[prop];
  },
  has: (target, prop) => true,
});
export const redisGuardService = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === "string" && prop !== "then") return () => {};
    return target[prop];
  },
  has: (target, prop) => true,
});
