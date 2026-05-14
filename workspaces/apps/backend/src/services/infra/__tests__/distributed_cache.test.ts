import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Distributed Cache Invalidation", () => {
  const mockUserId = new ObjectId();
  const mockTargetId = new ObjectId();
  const mockChatId = new ObjectId();

  let chatRepository: any;
  let userRepository: any;
  let partnerRepository: any;
  let chatActionService: any;
  let chatLockdownService: any;
  let redisSessionService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.doMock("@repositories/chat.repository", () => ({
      ChatRepository: vi.fn(),
    }));
    vi.doMock("@repositories/user.repository", () => ({
      UserRepository: vi.fn(),
    }));
    vi.doMock("@repositories/partner.repository", () => ({
      PartnerRepository: vi.fn(),
    }));

    chatRepository = {
      findById: vi.fn(),
      updateById: vi.fn(),
    };
    userRepository = {
      findById: vi.fn(),
    };
    partnerRepository = {
      getPartnerIds: vi.fn(),
      invalidatePartnerCache: vi.fn(),
    };
    redisSessionService = {
      publishCacheInvalidation: vi.fn().mockResolvedValue(null),
    };

    const { ChatActionService } = await import("@services/chat/chat-action.service");
    chatActionService = new ChatActionService(
      chatRepository,
      userRepository,
      { lockdownChat: vi.fn(), unlockChat: vi.fn(), isChatDeleted: vi.fn() },
      redisSessionService,
    );
  });

  describe("ChatActionService.acceptChat", () => {
    it("should publish partner invalidation for both participants when a chat is accepted", async () => {
      const mockChat = {
        _id: mockChatId,
        participants: [mockUserId, mockTargetId],
        status: "pending",
        createdBy: mockUserId,
      };

      chatRepository.findById.mockResolvedValue(mockChat as any);
      chatRepository.updateById.mockResolvedValue({
        ...mockChat,
        status: "accepted",
      } as any);
      userRepository.findById.mockResolvedValue({ username: "acceptor" } as any);

      await chatActionService.acceptChat(mockChatId, mockTargetId);

      expect(redisSessionService.publishCacheInvalidation).toHaveBeenCalledWith("partner", mockUserId.toString());
      expect(redisSessionService.publishCacheInvalidation).toHaveBeenCalledWith("partner", mockTargetId.toString());
    });
  });

  describe("ChatActionService.deleteChat", () => {
    it("should publish partner and chat invalidations when a chat is deleted", async () => {
      const mockChat = {
        _id: mockChatId,
        participants: [mockUserId, mockTargetId],
        status: "accepted",
      };

      chatRepository.findById.mockResolvedValue(mockChat as any);
      chatRepository.updateById.mockResolvedValue({
        ...mockChat,
        isDeleted: true,
      } as any);

      await chatActionService.deleteChat(mockChatId, mockUserId);

      expect(redisSessionService.publishCacheInvalidation).toHaveBeenCalledWith("partner", mockUserId.toString());
      expect(redisSessionService.publishCacheInvalidation).toHaveBeenCalledWith("partner", mockTargetId.toString());
      expect(redisSessionService.publishCacheInvalidation).toHaveBeenCalledWith("chat", mockChatId.toString());
    });
  });
});
