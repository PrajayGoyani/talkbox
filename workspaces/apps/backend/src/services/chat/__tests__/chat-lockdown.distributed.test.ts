import { chatLockdownService } from "@services/chat/chat-lockdown.service";
import { redisService } from "@services/infra/redis.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@models/chat.model");
vi.mock("@services/infra/redis.service", () => ({
  redisService: {
    lockChat: vi.fn().mockResolvedValue(null),
    unlockChat: vi.fn().mockResolvedValue(null),
    isChatLocked: vi.fn().mockResolvedValue(false),
    publishCacheInvalidation: vi.fn().mockResolvedValue(null),
    isConnected: true,
  },
}));

describe("ChatLockdownService Redis-First", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delegating locking to redisService", async () => {
    const chatId = "chat123";
    await chatLockdownService.lockdownChat(chatId);

    expect(vi.spyOn(redisService, "lockChat")).toHaveBeenCalledWith(chatId);
  });

  it("should delegating unlocking to redisService", async () => {
    const chatId = "chat123";
    await chatLockdownService.unlockChat(chatId);

    expect(vi.spyOn(redisService, "unlockChat")).toHaveBeenCalledWith(chatId);
  });

  it("should delegating existence check to redisService and be async", async () => {
    const chatId = "chat123";
    vi.spyOn(redisService, "isChatLocked").mockResolvedValue(true);

    const result = await chatLockdownService.isChatDeleted(chatId);

    expect(result).toBe(true);
    expect(vi.spyOn(redisService, "isChatLocked")).toHaveBeenCalledWith(chatId);
  });

  it("should return false if redisService returns false", async () => {
    const chatId = "chat456";
    vi.spyOn(redisService, "isChatLocked").mockResolvedValue(false);

    const result = await chatLockdownService.isChatDeleted(chatId);

    expect(result).toBe(false);
  });
});
