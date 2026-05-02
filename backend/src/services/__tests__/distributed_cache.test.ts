import { chatRepository } from "@repositories/chat.repository";
import { userRepository } from "@repositories/user.repository";
import { chatActionService } from "@services/chat/chat-action.service";
import { messageService } from "@services/chat/message.service";
import { redisService } from "@services/redis.service";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@services/redis.service", () => ({
  redisService: {
    publishCacheInvalidation: vi.fn().mockResolvedValue(null),
    isConnected: true,
  },
}));

vi.mock("@repositories/chat.repository");
vi.mock("@repositories/user.repository");
vi.mock("@services/chat-lockdown.service");
vi.mock("@services/chat/message.service", () => ({
  messageService: {
    invalidateCache: vi.fn(),
  },
}));

describe("Distributed Cache Invalidation", () => {
  const mockUserId = new ObjectId();
  const mockTargetId = new ObjectId();
  const mockChatId = new ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ChatActionService.acceptChat", () => {
    it("should publish partner invalidation for both participants when a chat is accepted", async () => {
      const mockChat = {
        _id: mockChatId,
        participants: [mockUserId, mockTargetId],
        status: "pending",
        createdBy: mockUserId,
      };

      vi.mocked(chatRepository).findById.mockResolvedValue(mockChat as any);
      vi.mocked(chatRepository).updateById.mockResolvedValue({
        ...mockChat,
        status: "accepted",
      } as any);
      vi.mocked(userRepository).findById.mockResolvedValue({ username: "acceptor" } as any);

      await chatActionService.acceptChat(mockChatId, mockTargetId);

      expect(redisService.publishCacheInvalidation).toHaveBeenCalledWith("partner", mockUserId.toString());
      expect(redisService.publishCacheInvalidation).toHaveBeenCalledWith("partner", mockTargetId.toString());
    });
  });

  describe("ChatActionService.deleteChat", () => {
    it("should publish partner and chat invalidations when a chat is deleted", async () => {
      const mockChat = {
        _id: mockChatId,
        participants: [mockUserId, mockTargetId],
        status: "accepted",
      };

      vi.mocked(chatRepository.findById).mockResolvedValue(mockChat as any);
      vi.mocked(chatRepository.updateById).mockResolvedValue({
        ...mockChat,
        isDeleted: true,
      } as any);

      await chatActionService.deleteChat(mockChatId, mockUserId);

      expect(vi.mocked(redisService).publishCacheInvalidation).toHaveBeenCalledWith("partner", mockUserId.toString());
      expect(vi.mocked(redisService).publishCacheInvalidation).toHaveBeenCalledWith("partner", mockTargetId.toString());
      expect(vi.mocked(redisService).publishCacheInvalidation).toHaveBeenCalledWith("chat", mockChatId.toString());
    });
  });

  describe("SocketService Invalidation Handling", () => {
    it("should call chatRepository.invalidatePartnerCache when receiving partner invalidation", async () => {
      const { socketService } = await import("@services/socket.service");
      const userId = "user123";

      // Access private method for testing
      (socketService as any)._handleGlobalCacheInvalidation("partner", userId);

      expect(vi.mocked(chatRepository).invalidatePartnerCache).toHaveBeenCalledWith(userId);
    });

    it("should call messageService.invalidateCache when receiving chat invalidation", async () => {
      const { socketService } = await import("@services/socket.service");
      const chatId = "chat123";

      (socketService as any)._handleGlobalCacheInvalidation("chat", chatId);

      expect(vi.mocked(messageService).invalidateCache).toHaveBeenCalledWith(chatId);
    });
  });
});
