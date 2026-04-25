import { beforeEach, describe, expect, it, vi } from "vitest";

// Advanced mock for ioredis
const mockRedisInstance = {
  on: vi.fn(),
  multi: vi.fn().mockReturnThis(),
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  srem: vi.fn().mockReturnThis(),
  scard: vi.fn().mockResolvedValue(0),
  set: vi.fn().mockResolvedValue("OK"),
  spop: vi.fn().mockResolvedValue([]),
  exec: vi.fn().mockResolvedValue([
    [null, 1],
    [null, 1],
  ]),
  pipeline: vi.fn().mockReturnThis(),
  sismember: vi.fn().mockReturnThis(),
  smembers: vi.fn().mockResolvedValue([]),
  publish: vi.fn().mockResolvedValue(1),
  quit: vi.fn().mockResolvedValue("OK"),
  mget: vi.fn().mockResolvedValue([]),
};

vi.mock("@sentry/node", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  init: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
}));

vi.mock("ioredis", () => ({
  Redis: vi.fn(() => mockRedisInstance),
  default: vi.fn(() => mockRedisInstance),
}));

import { redisService } from "@services/redis.service";

describe("RedisService (Expanded)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisService.client = mockRedisInstance as any;
    redisService.isConnected = true;
  });

  describe("checkAndSetIdempotency", () => {
    it("should return true if key is new", async () => {
      vi.mocked(mockRedisInstance.set).mockResolvedValue("OK");
      const result = await redisService.checkAndSetIdempotency("key1");
      expect(result).toBe(true);
      expect(mockRedisInstance.set).toHaveBeenCalledWith("idempotency:key1", "1", "EX", 900, "NX");
    });

    it("should return false if key exists", async () => {
      vi.mocked(mockRedisInstance.set).mockResolvedValue(null);
      const result = await redisService.checkAndSetIdempotency("key1");
      expect(result).toBe(false);
    });
  });

  describe("Presence Sync Queue", () => {
    it("should queue presence sync properly", async () => {
      await redisService.queuePresenceSync("u1");
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith("presence_sync_queue", "u1");
    });

    it("should pop from sync queue", async () => {
      vi.mocked(mockRedisInstance.spop).mockResolvedValue(["u1", "u2"]);
      const result = await redisService.popSyncQueue(100);
      expect(result).toEqual(["u1", "u2"]);
      expect(mockRedisInstance.spop).toHaveBeenCalledWith("presence_sync_queue", 100);
    });

    it("should get queue count", async () => {
      vi.mocked(mockRedisInstance.scard).mockResolvedValue(50);
      const result = await redisService.getSyncQueueCount();
      expect(result).toBe(50);
    });
  });

  describe("Last Seen", () => {
    it("should get batched last seen", async () => {
      vi.mocked(mockRedisInstance.mget).mockResolvedValue(["2024-01-01T10:00:00Z", null]);
      const result = await redisService.getLastSeenBatched(["u1", "u2"]);
      expect(result.get("u1")).toBeInstanceOf(Date);
      expect(result.has("u2")).toBe(false);
    });
  });
});
