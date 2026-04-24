import User from "@models/user.model";
import { redisService } from "@services/redis.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { presenceSyncHandler } from "../presence-sync.handler";

vi.mock("@models/user.model", () => ({
  default: {
    bulkWrite: vi.fn(),
  },
}));

vi.mock("@sentry/node");

vi.mock("@services/redis.service", () => ({
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
    vi.mocked(redisService.getSyncQueueCount).mockResolvedValue(0);
  });

  it("should process users in batches and perform bulkWrite", async () => {
    const userIds = ["u1", "u2"];
    const lastSeenMap = new Map([["u1", new Date()]]);

    vi.mocked(redisService.popSyncQueue).mockResolvedValueOnce(userIds).mockResolvedValueOnce([]);
    vi.mocked(redisService.getLastSeenBatched).mockResolvedValue(lastSeenMap);
    vi.mocked(User.bulkWrite).mockResolvedValue({} as any);

    await presenceSyncHandler();

    expect(redisService.popSyncQueue).toHaveBeenCalled();
    expect(User.bulkWrite).toHaveBeenCalled();
  });

  it("should re-queue users if bulkWrite fails", async () => {
    const userIds = ["u1", "u2"];
    const lastSeenMap = new Map([["u1", new Date()]]);

    vi.mocked(redisService.popSyncQueue).mockResolvedValueOnce(userIds);
    vi.mocked(redisService.getLastSeenBatched).mockResolvedValueOnce(lastSeenMap);
    vi.mocked(User.bulkWrite).mockRejectedValueOnce(new Error("DB Error"));
    vi.mocked(redisService.queuePresenceSyncBatched).mockResolvedValueOnce(undefined);

    await presenceSyncHandler();

    expect(redisService.queuePresenceSyncBatched).toHaveBeenCalled();
    const calls = vi.mocked(redisService.queuePresenceSyncBatched).mock.calls;
    expect(calls[0][0]).toEqual(expect.arrayContaining(userIds));
  });

  it("should stop processing after MAX_BATCHES_PER_RUN", async () => {
    const batchSize = 1000;
    const fullBatch = Array.from({ length: batchSize }, (_, i) => `u${i}`);

    // Explicitly mock ALL 50 calls plus one more just in case
    for (let i = 0; i < 50; i++) {
      vi.mocked(redisService.popSyncQueue).mockResolvedValueOnce(fullBatch);
    }
    vi.mocked(redisService.popSyncQueue).mockResolvedValue([]); // Fallback

    vi.mocked(redisService.getLastSeenBatched).mockResolvedValue(new Map([["u0", new Date()]]));
    vi.mocked(User.bulkWrite).mockResolvedValue({} as any);

    await presenceSyncHandler();

    expect(redisService.popSyncQueue).toHaveBeenCalledTimes(50);
  });
});
