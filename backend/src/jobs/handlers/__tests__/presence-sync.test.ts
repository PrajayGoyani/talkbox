import User from "@models/user.model";
import * as Sentry from "@sentry/node";
import { redisService } from "@services/redis.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { presenceSyncHandler } from "../presence-sync.handler";

vi.mock("@models/user.model");
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
    vi.clearAllMocks();
    vi.mocked(redisService.popSyncQueue).mockResolvedValue([]);
    vi.mocked(redisService.getLastSeenBatched).mockResolvedValue(new Map());
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
    vi.mocked(redisService.popSyncQueue).mockResolvedValueOnce(userIds).mockResolvedValueOnce([]);
    vi.mocked(redisService.getLastSeenBatched).mockResolvedValue(lastSeenMap);
    vi.mocked(User.bulkWrite).mockRejectedValue(new Error("DB Error"));

    await presenceSyncHandler();

    expect(redisService.queuePresenceSyncBatched).toHaveBeenCalledWith(userIds);
  });

  it("should stop processing after MAX_BATCHES_PER_RUN", async () => {
    // Generate 1000 items
    const batch = Array.from({ length: 1000 }, (_, i) => `u${i}`);
    vi.mocked(redisService.popSyncQueue).mockResolvedValue(batch);
    vi.mocked(redisService.getLastSeenBatched).mockResolvedValue(new Map([["u0", new Date()]]));
    vi.mocked(User.bulkWrite).mockResolvedValue({} as any);

    await presenceSyncHandler();

    expect(redisService.popSyncQueue).toHaveBeenCalledTimes(50);
  });
});
