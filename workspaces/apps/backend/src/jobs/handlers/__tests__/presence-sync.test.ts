import { presenceSyncHandler } from "@jobs/handlers/presence-sync.handler";
import User from "@models/user.model";
import { redisService } from "@services/infra/redis.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@models/user.model", () => ({
  default: {
    bulkWrite: vi.fn(),
  },
}));

vi.mock("@sentry/bun");

vi.mock("@services/infra/redis.service", () => ({
  redisService: {
    popSyncQueue: vi.fn(),
    getLastSeenBatched: vi.fn(),
    getSyncQueueCount: vi.fn(),
    queuePresenceSyncBatched: vi.fn(),
  },
}));

describe("PresenceSyncHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(redisService, "getSyncQueueCount").mockResolvedValue(0);
  });

  it("should process users in batches and perform bulkWrite", async () => {
    const userIds = ["u1", "u2"];
    const lastSeenMap = new Map([["u1", new Date()]]);

    vi.spyOn(redisService, "popSyncQueue").mockResolvedValueOnce(userIds).mockResolvedValueOnce([]);
    vi.spyOn(redisService, "getLastSeenBatched").mockResolvedValue(lastSeenMap);
    vi.spyOn(User, "bulkWrite").mockResolvedValue({} as any);

    await presenceSyncHandler();

    expect(vi.spyOn(redisService, "popSyncQueue")).toHaveBeenCalled();
    expect(vi.spyOn(User, "bulkWrite")).toHaveBeenCalled();
  });

  it("should re-queue users if bulkWrite fails", async () => {
    const userIds = ["u1", "u2"];
    const lastSeenMap = new Map([["u1", new Date()]]);

    vi.spyOn(redisService, "popSyncQueue").mockResolvedValueOnce(userIds);
    vi.spyOn(redisService, "getLastSeenBatched").mockResolvedValueOnce(lastSeenMap);
    vi.spyOn(User, "bulkWrite").mockRejectedValueOnce(new Error("DB Error"));
    vi.spyOn(redisService, "queuePresenceSyncBatched").mockResolvedValueOnce(undefined);

    await presenceSyncHandler();

    expect(vi.spyOn(redisService, "queuePresenceSyncBatched")).toHaveBeenCalled();
    const calls = vi.spyOn(redisService, "queuePresenceSyncBatched").mock.calls;
    expect(calls[0][0]).toEqual(expect.arrayContaining(userIds));
  });

  it("should stop processing after MAX_BATCHES_PER_RUN", async () => {
    const batchSize = 1000;
    const fullBatch = Array.from({ length: batchSize }, (_, i) => `u${i}`);

    // Explicitly mock ALL 50 calls plus one more just in case
    for (let i = 0; i < 50; i++) {
      vi.spyOn(redisService, "popSyncQueue").mockResolvedValueOnce(fullBatch);
    }
    vi.spyOn(redisService, "popSyncQueue").mockResolvedValue([]); // Fallback

    vi.spyOn(redisService, "getLastSeenBatched").mockResolvedValue(new Map([["u0", new Date()]]));
    vi.spyOn(User, "bulkWrite").mockResolvedValue({} as any);

    await presenceSyncHandler();

    expect(vi.spyOn(redisService, "popSyncQueue")).toHaveBeenCalledTimes(50);
  });
});
