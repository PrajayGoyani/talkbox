import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMultiChain = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  pttl: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  srem: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([
    [null, 1],
    [null, 1],
  ]),
};

const mockRedisInstance = {
  on: vi.fn(),
  multi: vi.fn().mockReturnValue(mockMultiChain),
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  srem: vi.fn().mockReturnThis(),
  scard: vi.fn().mockResolvedValue(0),
  set: vi.fn().mockResolvedValue("OK"),
  spop: vi.fn().mockResolvedValue([]),
  pipeline: vi.fn().mockReturnThis(),
  sismember: vi.fn().mockReturnThis(),
  smembers: vi.fn().mockResolvedValue([]),
  publish: vi.fn().mockResolvedValue(1),
  quit: vi.fn().mockResolvedValue("OK"),
  mget: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue(null),
};

vi.mock("@sentry/bun", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  init: vi.fn(),
}));

import { RedisBaseService } from "@services/infra/redis/base";
import { RedisGuardService } from "@services/infra/redis/guard";
import { RedisPresenceService } from "@services/infra/redis/presence";

describe("RedisService (Expanded)", () => {
  let baseService: any;
  let redisGuardService: RedisGuardService;
  let redisPresenceService: RedisPresenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    baseService = new (RedisBaseService as any)();
    baseService.client = mockRedisInstance as any;
    baseService.isConnected = true;
    redisGuardService = new RedisGuardService(baseService);
    redisPresenceService = new RedisPresenceService(baseService);
  });

  // ─── RedisGuardService ──────────────────────────────────────────────────

  describe("lockChat", () => {
    it("should add chatId to lockdown set", async () => {
      await redisGuardService.lockChat("chat123");
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith("lockdown:chats", "chat123");
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisGuardService.lockChat("chat123");
      expect(mockRedisInstance.sadd).not.toHaveBeenCalled();
    });

    it("should handle Redis error gracefully", async () => {
      mockRedisInstance.sadd.mockRejectedValueOnce(new Error("Redis down"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await redisGuardService.lockChat("chat123");
      expect(consoleSpy).toHaveBeenCalledWith("[RedisGuardService] Error locking chat:", expect.any(Error));
    });
  });

  describe("unlockChat", () => {
    it("should remove chatId from lockdown set", async () => {
      await redisGuardService.unlockChat("chat123");
      expect(mockRedisInstance.srem).toHaveBeenCalledWith("lockdown:chats", "chat123");
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisGuardService.unlockChat("chat123");
      expect(mockRedisInstance.srem).not.toHaveBeenCalled();
    });

    it("should handle Redis error gracefully", async () => {
      mockRedisInstance.srem.mockRejectedValueOnce(new Error("Redis down"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await redisGuardService.unlockChat("chat123");
      expect(consoleSpy).toHaveBeenCalledWith("[RedisGuardService] Error unlocking chat:", expect.any(Error));
    });
  });

  describe("isChatLocked", () => {
    it("should return true when chat is in lockdown set", async () => {
      mockRedisInstance.sismember.mockResolvedValue(1);
      const result = await redisGuardService.isChatLocked("chat123");
      expect(result).toBe(true);
      expect(mockRedisInstance.sismember).toHaveBeenCalledWith("lockdown:chats", "chat123");
    });

    it("should return false when chat is not in lockdown set", async () => {
      mockRedisInstance.sismember.mockResolvedValue(0);
      const result = await redisGuardService.isChatLocked("chat456");
      expect(result).toBe(false);
    });

    it("should fail open (return false) when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await redisGuardService.isChatLocked("chat123");
      expect(result).toBe(false);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Redis disconnected. Failing open for chat lockdown check"),
      );
    });

    it("should return false on Redis error", async () => {
      mockRedisInstance.sismember.mockRejectedValue(new Error("Redis down"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await redisGuardService.isChatLocked("chat123");
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("[RedisGuardService] Error checking chat lockdown:", expect.any(Error));
    });
  });

  describe("incrementAndCheckLimit", () => {
    it("should return allowed when under limit", async () => {
      mockMultiChain.exec.mockResolvedValueOnce([
        [null, 3],
        [null, "OK"],
        [null, 45000],
      ]);
      const result = await redisGuardService.incrementAndCheckLimit("key1", 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(3);
      expect(result.ttl).toBe(45000);
      expect(mockRedisInstance.multi).toHaveBeenCalled();
    });

    it("should return not allowed when over limit", async () => {
      mockMultiChain.exec.mockResolvedValueOnce([
        [null, 15],
        [null, "OK"],
        [null, 30000],
      ]);
      const result = await redisGuardService.incrementAndCheckLimit("key1", 10, 60000);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(15);
      expect(result.ttl).toBe(30000);
    });

    it("should fail open when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await redisGuardService.incrementAndCheckLimit("key1", 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.ttl).toBe(60000);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Redis disconnected. Failing open for rate limit key"),
      );
    });

    it("should handle Redis exec error gracefully", async () => {
      mockMultiChain.exec.mockRejectedValueOnce(new Error("Redis down"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await redisGuardService.incrementAndCheckLimit("key1", 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.ttl).toBe(60000);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[RedisGuardService] Error incrementing rate limit counter:",
        expect.any(Error),
      );
    });
  });

  describe("checkAndSetIdempotency", () => {
    it("should return true if key is new", async () => {
      mockRedisInstance.set.mockResolvedValue("OK");
      const result = await redisGuardService.checkAndSetIdempotency("key1");
      expect(result).toBe(true);
      expect(mockRedisInstance.set).toHaveBeenCalledWith("idempotency:key1", "1", "EX", 900, "NX");
    });

    it("should return false if key exists", async () => {
      mockRedisInstance.set.mockResolvedValue(null);
      const result = await redisGuardService.checkAndSetIdempotency("key1");
      expect(result).toBe(false);
    });

    it("should fail open when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await redisGuardService.checkAndSetIdempotency("key1");
      expect(result).toBe(true);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Redis disconnected. Failing open for idempotency key"),
      );
    });

    it("should handle Redis set error gracefully", async () => {
      mockRedisInstance.set.mockRejectedValue(new Error("Redis down"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await redisGuardService.checkAndSetIdempotency("key1");
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("[RedisGuardService] Error checking idempotency key:", expect.any(Error));
    });
  });

  // ─── RedisPresenceService: Partner Caching ─────────────────────────────

  describe("getCachedPartners", () => {
    it("should return partners set when cached", async () => {
      mockRedisInstance.smembers.mockResolvedValue(["p1", "p2"]);
      const result = await redisPresenceService.getCachedPartners("u1");
      expect(result).toEqual(new Set(["p1", "p2"]));
      expect(mockRedisInstance.smembers).toHaveBeenCalledWith("partners:u1");
    });

    it("should return null when no partners cached", async () => {
      mockRedisInstance.smembers.mockResolvedValue([]);
      const result = await redisPresenceService.getCachedPartners("u1");
      expect(result).toBeNull();
    });

    it("should return null when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const result = await redisPresenceService.getCachedPartners("u1");
      expect(result).toBeNull();
      expect(mockRedisInstance.smembers).not.toHaveBeenCalled();
    });

    it("should use active key when activeOnly is true", async () => {
      mockRedisInstance.smembers.mockResolvedValue(["p1"]);
      await redisPresenceService.getCachedPartners("u1", true);
      expect(mockRedisInstance.smembers).toHaveBeenCalledWith("partners:u1:active");
    });
  });

  describe("setCachedPartners", () => {
    it("should store partners with TTL", async () => {
      await redisPresenceService.setCachedPartners("u1", ["p1", "p2"]);
      expect(mockRedisInstance.multi).toHaveBeenCalled();
      expect(mockMultiChain.del).toHaveBeenCalledWith("partners:u1");
      expect(mockMultiChain.sadd).toHaveBeenCalledWith("partners:u1", "p1", "p2");
      expect(mockMultiChain.expire).toHaveBeenCalledWith("partners:u1", 1800);
      expect(mockMultiChain.exec).toHaveBeenCalled();
    });

    it("should use active key when activeOnly is true", async () => {
      await redisPresenceService.setCachedPartners("u1", ["p1"], true);
      expect(mockMultiChain.del).toHaveBeenCalledWith("partners:u1:active");
      expect(mockMultiChain.sadd).toHaveBeenCalledWith("partners:u1:active", "p1");
    });

    it("should be noop when partnerIds is empty", async () => {
      await redisPresenceService.setCachedPartners("u1", []);
      expect(mockRedisInstance.multi).not.toHaveBeenCalled();
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisPresenceService.setCachedPartners("u1", ["p1"]);
      expect(mockRedisInstance.multi).not.toHaveBeenCalled();
    });
  });

  describe("invalidatePartnerCache", () => {
    it("should delete both partner cache keys", async () => {
      await redisPresenceService.invalidatePartnerCache("u1");
      expect(mockRedisInstance.del).toHaveBeenCalledWith("partners:u1", "partners:u1:active");
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisPresenceService.invalidatePartnerCache("u1");
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  // ─── RedisPresenceService: Presence Tracking ──────────────────────────

  describe("setUserOnline", () => {
    it("should add user to online set and publish", async () => {
      await redisPresenceService.setUserOnline("u1");
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith("online_users", "u1");
      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        "presence:updates",
        JSON.stringify({ userId: "u1", isOnline: true }),
      );
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisPresenceService.setUserOnline("u1");
      expect(mockRedisInstance.sadd).not.toHaveBeenCalled();
      expect(mockRedisInstance.publish).not.toHaveBeenCalled();
    });
  });

  describe("setUserOffline", () => {
    it("should remove user and store last seen with TTL", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      await redisPresenceService.setUserOffline("u1", now);
      expect(mockRedisInstance.multi).toHaveBeenCalled();
      expect(mockMultiChain.srem).toHaveBeenCalledWith("online_users", "u1");
      expect(mockMultiChain.set).toHaveBeenCalledWith("user:ls:u1", now.toISOString(), "EX", 604800);
      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        "presence:updates",
        JSON.stringify({ userId: "u1", isOnline: false }),
      );
    });

    it("should use current date when lastSeen is not provided", async () => {
      vi.useFakeTimers();
      const now = new Date("2024-06-15T12:00:00Z");
      vi.setSystemTime(now);
      await redisPresenceService.setUserOffline("u1");
      expect(mockMultiChain.set).toHaveBeenCalledWith("user:ls:u1", now.toISOString(), "EX", 604800);
      vi.useRealTimers();
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisPresenceService.setUserOffline("u1");
      expect(mockRedisInstance.srem).not.toHaveBeenCalled();
    });
  });

  describe("isUserOnline", () => {
    it("should return true when user is online", async () => {
      mockRedisInstance.sismember.mockResolvedValue(1);
      const result = await redisPresenceService.isUserOnline("u1");
      expect(result).toBe(true);
    });

    it("should return false when user is offline", async () => {
      mockRedisInstance.sismember.mockResolvedValue(0);
      const result = await redisPresenceService.isUserOnline("u1");
      expect(result).toBe(false);
    });

    it("should return false when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const result = await redisPresenceService.isUserOnline("u1");
      expect(result).toBe(false);
      expect(mockRedisInstance.sismember).not.toHaveBeenCalled();
    });
  });

  describe("getOnlineUsers", () => {
    it("should return set of online users", async () => {
      const mockPipeline = { sismember: vi.fn(), exec: vi.fn() };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);
      mockPipeline.sismember = vi.fn().mockReturnThis();
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 0],
        [null, 1],
      ]);

      const result = await redisPresenceService.getOnlineUsers(["u1", "u2", "u3"]);
      expect(result).toEqual(new Set(["u1", "u3"]));
    });

    it("should return empty set when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const result = await redisPresenceService.getOnlineUsers(["u1"]);
      expect(result).toEqual(new Set());
      expect(mockRedisInstance.pipeline).not.toHaveBeenCalled();
    });

    it("should return empty set for empty input", async () => {
      const result = await redisPresenceService.getOnlineUsers([]);
      expect(result).toEqual(new Set());
      expect(mockRedisInstance.pipeline).not.toHaveBeenCalled();
    });
  });

  // ─── RedisPresenceService: Presence Sync Queue ────────────────────────

  describe("queuePresenceSync", () => {
    it("should add user to sync queue", async () => {
      await redisPresenceService.queuePresenceSync("u1");
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith("presence_sync_queue", "u1");
    });
  });

  describe("queuePresenceSyncBatched", () => {
    it("should add multiple users to sync queue", async () => {
      await redisPresenceService.queuePresenceSyncBatched(["u1", "u2"]);
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith("presence_sync_queue", "u1", "u2");
    });

    it("should be noop for empty batch", async () => {
      await redisPresenceService.queuePresenceSyncBatched([]);
      expect(mockRedisInstance.sadd).not.toHaveBeenCalled();
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisPresenceService.queuePresenceSyncBatched(["u1"]);
      expect(mockRedisInstance.sadd).not.toHaveBeenCalled();
    });
  });

  describe("popSyncQueue", () => {
    it("should pop users from sync queue", async () => {
      mockRedisInstance.spop.mockResolvedValue(["u1", "u2"]);
      const result = await redisPresenceService.popSyncQueue(100);
      expect(result).toEqual(["u1", "u2"]);
      expect(mockRedisInstance.spop).toHaveBeenCalledWith("presence_sync_queue", 100);
    });

    it("should return empty array when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const result = await redisPresenceService.popSyncQueue(100);
      expect(result).toEqual([]);
      expect(mockRedisInstance.spop).not.toHaveBeenCalled();
    });
  });

  describe("getSyncQueueCount", () => {
    it("should return queue size", async () => {
      mockRedisInstance.scard.mockResolvedValue(50);
      const result = await redisPresenceService.getSyncQueueCount();
      expect(result).toBe(50);
    });

    it("should return 0 when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const result = await redisPresenceService.getSyncQueueCount();
      expect(result).toBe(0);
      expect(mockRedisInstance.scard).not.toHaveBeenCalled();
    });
  });

  // ─── RedisPresenceService: Active Chat Tracking ───────────────────────

  describe("setActiveChat", () => {
    it("should set active chat with TTL", async () => {
      await redisPresenceService.setActiveChat("u1", "chat123");
      expect(mockRedisInstance.set).toHaveBeenCalledWith("user:active_chat:u1", "chat123", "EX", 3600);
    });

    it("should delete active chat when chatId is null", async () => {
      await redisPresenceService.setActiveChat("u1", null);
      expect(mockRedisInstance.del).toHaveBeenCalledWith("user:active_chat:u1");
      expect(mockRedisInstance.set).not.toHaveBeenCalled();
    });

    it("should be noop when Redis is disconnected", async () => {
      baseService.isConnected = false;
      await redisPresenceService.setActiveChat("u1", "chat123");
      expect(mockRedisInstance.set).not.toHaveBeenCalled();
    });
  });

  describe("getActiveChat", () => {
    it("should return active chat when set", async () => {
      mockRedisInstance.get.mockResolvedValue("chat123");
      const result = await redisPresenceService.getActiveChat("u1");
      expect(result).toBe("chat123");
      expect(mockRedisInstance.get).toHaveBeenCalledWith("user:active_chat:u1");
    });

    it("should return null when no active chat", async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const result = await redisPresenceService.getActiveChat("u1");
      expect(result).toBeNull();
    });

    it("should return null when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const result = await redisPresenceService.getActiveChat("u1");
      expect(result).toBeNull();
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });
  });

  // ─── RedisPresenceService: Last Seen ──────────────────────────────────

  describe("getLastSeenBatched", () => {
    it("should return map of last seen dates", async () => {
      mockRedisInstance.mget.mockResolvedValue(["2024-01-01T10:00:00Z", null]);
      const result = await redisPresenceService.getLastSeenBatched(["u1", "u2"]);
      expect(result.get("u1")).toBeInstanceOf(Date);
      expect(result.get("u1")!.toISOString()).toBe("2024-01-01T10:00:00.000Z");
      expect(result.has("u2")).toBe(false);
      expect(mockRedisInstance.mget).toHaveBeenCalledWith("user:ls:u1", "user:ls:u2");
    });

    it("should return empty map for empty input", async () => {
      const result = await redisPresenceService.getLastSeenBatched([]);
      expect(result.size).toBe(0);
      expect(mockRedisInstance.mget).not.toHaveBeenCalled();
    });

    it("should return empty map when Redis is disconnected", async () => {
      baseService.isConnected = false;
      const result = await redisPresenceService.getLastSeenBatched(["u1"]);
      expect(result.size).toBe(0);
      expect(mockRedisInstance.mget).not.toHaveBeenCalled();
    });
  });
});
