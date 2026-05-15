import { ChatLockdownService } from "@services/chat/chat-lockdown.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ChatLockdownService Redis-First", () => {
  let chatLockdownService: ChatLockdownService;
  let guardService: any;
  let sessionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    guardService = {
      lockChat: vi.fn().mockResolvedValue(null),
      unlockChat: vi.fn().mockResolvedValue(null),
      isChatLocked: vi.fn().mockResolvedValue(false),
    };
    sessionService = {
      publishCacheInvalidation: vi.fn().mockResolvedValue(null),
    };
    chatLockdownService = new ChatLockdownService(guardService, sessionService);
  });

  it("should delegating locking to redisService and invalidate cache", async () => {
    const chatId = "chat123";
    await chatLockdownService.lockdownChat(chatId);

    expect(guardService.lockChat).toHaveBeenCalledWith(chatId);
    expect(sessionService.publishCacheInvalidation).toHaveBeenCalledWith("chat", chatId);
  });

  it("should delegating unlocking to redisService and invalidate cache", async () => {
    const chatId = "chat123";
    await chatLockdownService.unlockChat(chatId);

    expect(guardService.unlockChat).toHaveBeenCalledWith(chatId);
    expect(sessionService.publishCacheInvalidation).toHaveBeenCalledWith("chat", chatId);
  });

  it("should delegating existence check to redisService and be async", async () => {
    const chatId = "chat123";
    guardService.isChatLocked.mockResolvedValue(true);

    const result = await chatLockdownService.isChatDeleted(chatId);

    expect(result).toBe(true);
    expect(guardService.isChatLocked).toHaveBeenCalledWith(chatId);
  });

  it("should return false if redisService returns false", async () => {
    const chatId = "chat456";
    guardService.isChatLocked.mockResolvedValue(false);

    const result = await chatLockdownService.isChatDeleted(chatId);

    expect(result).toBe(false);
  });
});
