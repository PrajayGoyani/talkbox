import { SocketService } from "@services/chat/socket.service";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("../../chat/chat-cache.service", () => ({
  chatCacheService: {
    getParticipants: vi.fn(),
    setParticipants: vi.fn(),
    invalidateParticipants: vi.fn(),
    getPartners: vi.fn(),
    setPartners: vi.fn(),
    invalidatePartners: vi.fn(),
    clear: vi.fn(),
  },
}));

const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_CHAT_ID = "507f1f77bcf86cd799439044";
const MOCK_RECEIVER_ID = "507f1f77bcf86cd799439055";

describe("Scalability Optimizations", () => {
  let socketService: SocketService;
  let chatCacheService: any;
  let redisPresenceService: any;
  let redisSessionService: any;
  let redisGuardService: any;
  let chatQueryRepository: any;
  let redisBaseService: any;
  let policyService: any;
  let chatRepo: any;
  let messageRepo: any;
  let messageService: any;
  let messageHandler: any;
  let typingHandler: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    chatCacheService = {
      getParticipants: vi.fn(),
      setParticipants: vi.fn(),
      invalidateParticipants: vi.fn(),
      getPartners: vi.fn(),
      setPartners: vi.fn(),
      invalidatePartners: vi.fn(),
      clear: vi.fn(),
    };

    redisPresenceService = {
      getCachedPartners: vi.fn(),
      setCachedPartners: vi.fn(),
      getActiveChat: vi.fn().mockResolvedValue(null),
      queuePresenceSync: vi.fn().mockResolvedValue(null),
      getLastSeenBatched: vi.fn().mockResolvedValue(new Map()),
      setUserOnline: vi.fn().mockResolvedValue(null),
      setUserOffline: vi.fn().mockResolvedValue(null),
    };

    redisSessionService = {
      publishCacheInvalidation: vi.fn().mockResolvedValue(null),
      incrementGlobalSession: vi.fn(),
      decrementGlobalSession: vi.fn(),
      getGlobalSessionCount: vi.fn(),
      getOldestSession: vi.fn().mockResolvedValue(null),
      publishSessionTakeover: vi.fn(),
      takeoverFreeSession: vi.fn(),
    };

    redisGuardService = {
      incrementAndCheckLimit: vi.fn().mockResolvedValue({ allowed: true, current: 1, ttl: 60000 }),
      checkAndSetIdempotency: vi.fn().mockResolvedValue(true),
      isChatLocked: vi.fn().mockResolvedValue(false),
    };

    chatQueryRepository = {
      findPartnerChats: vi.fn().mockResolvedValue([]),
      searchChats: vi.fn(),
      findAcceptedChatsByUser: vi.fn(),
      findPendingRequestsByUser: vi.fn(),
      transformChat: vi.fn(),
    };

    redisBaseService = {
      isConnected: true,
      client: { publish: vi.fn() },
      subClient: { subscribe: vi.fn(), on: vi.fn() },
    };

    policyService = { isSessionLimitReached: vi.fn().mockReturnValue(false) };

    chatRepo = { findById: vi.fn(), updateById: vi.fn() };
    messageRepo = { create: vi.fn(), findOne: vi.fn() };
    const userRepo: any = { findByIds: vi.fn() };
    const partnerRepo: any = { getPartnerIds: vi.fn().mockResolvedValue(new Set()), invalidatePartnerCache: vi.fn() };
    const { MessageService } = await import("../../chat/message.service");
    const { MessageHandler } = await import("../../socket-handlers/message.handler");
    const { TypingHandler } = await import("../../socket-handlers/typing.handler");

    const chatLockdownService: any = {
      lockdownChat: vi.fn(),
      unlockChat: vi.fn(),
      isChatDeleted: vi.fn().mockResolvedValue(false),
    };

    const realMessageService = new MessageService(
      chatRepo,
      messageRepo,
      chatLockdownService,
      redisPresenceService,
      redisGuardService,
    );

    const realMessageHandler = new MessageHandler(() => socketService.io, realMessageService);

    const realTypingHandler = new TypingHandler(
      () => socketService.io,
      chatRepo,
      realMessageService,
      redisGuardService,
    );

    const reactionHandler: any = { handleReaction: vi.fn() };

    const presenceService: any = { notifyStatusChange: vi.fn(), getPartnersStatusBatch: vi.fn().mockResolvedValue([]) };

    socketService = new SocketService(
      chatRepo,
      messageRepo,
      userRepo,
      chatQueryRepository,
      realMessageService,
      presenceService,
      realMessageHandler,
      reactionHandler,
      realTypingHandler,
      redisSessionService,
      redisPresenceService,
      redisBaseService,
      policyService,
      chatCacheService,
    );

    messageHandler = realMessageHandler;
    typingHandler = realTypingHandler;
    messageService = realMessageService;

    vi.spyOn(messageHandler, "saveAndDeliver");
    vi.spyOn(typingHandler, "handleTyping");

    (socketService as any).partnerRequests.clear();

    vi.spyOn(mongoose, "startSession").mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    } as any);

    const mockMessage = {
      _id: new ObjectId("507f1f77bcf86cd799439066"),
      chatId: new ObjectId(MOCK_CHAT_ID),
      senderId: new ObjectId(MOCK_USER_ID),
      contentBody: "Hi",
      createdAt: new Date(),
      toObject: function () {
        return this;
      },
      reactions: [],
    };

    messageRepo.create.mockResolvedValue(mockMessage as any);
    messageRepo.findOne.mockResolvedValue(null);
    chatRepo.findById.mockResolvedValue({
      _id: new ObjectId(MOCK_CHAT_ID),
      participants: [new ObjectId(MOCK_USER_ID), new ObjectId(MOCK_RECEIVER_ID)],
      status: "accepted",
    } as any);
    chatRepo.updateById.mockResolvedValue({
      _id: new ObjectId(MOCK_CHAT_ID),
      participants: [new ObjectId(MOCK_USER_ID), new ObjectId(MOCK_RECEIVER_ID)],
    } as any);
  });

  describe("Thundering Herd Protection (_getPartnerIds)", () => {
    it("should only trigger one database query for concurrent partner requests", async () => {
      const mockChats = [
        {
          _id: new ObjectId(MOCK_CHAT_ID),
          participants: [MOCK_USER_ID, "507f1f77bcf86cd799439088"],
          userA: MOCK_USER_ID,
          userB: "507f1f77bcf86cd799439088",
        },
        {
          _id: new ObjectId(),
          participants: ["507f1f77bcf86cd799439099", MOCK_USER_ID],
          userA: "507f1f77bcf86cd799439099",
          userB: MOCK_USER_ID,
        },
      ];

      let queryCount = 0;
      chatQueryRepository.findPartnerChats.mockImplementation(async () => {
        queryCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return mockChats as any;
      });

      redisPresenceService.getCachedPartners.mockResolvedValue(null);

      const results = await Promise.all([
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
      ]);

      expect(queryCount).toBe(1);
      results.forEach((res: any) => {
        expect(res).toBeInstanceOf(Set);
        expect(res.has("507f1f77bcf86cd799439088")).toBe(true);
        expect(res.has("507f1f77bcf86cd799439099")).toBe(true);
      });

      expect((socketService as any).partnerRequests.size).toBe(0);
    });
  });

  describe("Redis Idempotency L1 Guard", () => {
    it("should delegate saveAndDeliver to MessageHandler (which owns idempotency logic)", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = {
        chatId: MOCK_CHAT_ID,
        receiverId: MOCK_RECEIVER_ID,
        contentBody: "Hi",
        idempotencyKey: "unique-key",
      };

      await socketService.saveAndDeliverMessage(sender, payload);

      expect(messageHandler.saveAndDeliver).toHaveBeenCalledWith(sender, payload);
    });
  });

  describe("Typing Local Guard", () => {
    it("should delegate typing to TypingHandler (which owns throttle logic)", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "c1", receiverId: "r1" };

      await socketService.handleTyping(sender, payload, true);

      expect(typingHandler.handleTyping).toHaveBeenCalledWith(sender, payload, true);
    });
  });
});
