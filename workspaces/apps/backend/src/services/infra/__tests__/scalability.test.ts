import Chat from "@models/chat.model";
import Message from "@models/message.model";
import { chatQueryRepository } from "@repositories/chat-query.repository";
import { chatRepository } from "@repositories/chat.repository";
import { messageRepository } from "@repositories/message.repository";
import { chatCacheService } from "@services/chat/chat-cache.service";
import { socketService } from "@services/chat/socket.service";
import {
  redisPresenceService,
  redisSessionService,
  redisGuardService,
  baseService,
} from "@services/infra/redis.service";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@repositories/partner.repository", () => ({
  partnerRepository: {
    getPartnerIds: vi.fn(),
    invalidatePartnerCache: vi.fn(),
  },
}));
vi.mock("@repositories/chat-query.repository", () => ({
  chatQueryRepository: {
    findPartnerChats: vi.fn().mockResolvedValue([]),
    searchChats: vi.fn(),
    findAcceptedChatsByUser: vi.fn(),
    findPendingRequestsByUser: vi.fn(),
    transformChat: vi.fn(),
  },
}));

vi.mock("@services/infra/redis.service", () => ({
  redisPresenceService: {
    getCachedPartners: vi.fn(),
    setCachedPartners: vi.fn(),
    getActiveChat: vi.fn().mockResolvedValue(null),
    queuePresenceSync: vi.fn().mockResolvedValue(null),
    getLastSeenBatched: vi.fn().mockResolvedValue(new Map()),
    setUserOnline: vi.fn().mockResolvedValue(null),
    setUserOffline: vi.fn().mockResolvedValue(null),
  },
  redisSessionService: {
    publishCacheInvalidation: vi.fn().mockResolvedValue(null),
    incrementGlobalSession: vi.fn(),
    decrementGlobalSession: vi.fn(),
    getGlobalSessionCount: vi.fn(),
    getOldestSession: vi.fn().mockResolvedValue(null),
    publishSessionTakeover: vi.fn(),
    takeoverFreeSession: vi.fn(),
  },
  redisGuardService: {
    incrementAndCheckLimit: vi.fn().mockResolvedValue({ allowed: true, current: 1, ttl: 60000 }),
    checkAndSetIdempotency: vi.fn().mockResolvedValue(true),
    isChatLocked: vi.fn().mockResolvedValue(false),
  },
  baseService: {
    isConnected: true,
    client: { publish: vi.fn() },
    subClient: { subscribe: vi.fn(), on: vi.fn() },
  },
}));

const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_CHAT_ID = "507f1f77bcf86cd799439044";
const MOCK_RECEIVER_ID = "507f1f77bcf86cd799439055";

describe("Scalability Optimizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatCacheService.clear();
    (socketService as any).partnerRequests.clear();
    // Reset TypingHandler local guard
    (socketService as any).typingHandler.localGuard.clear();

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

    vi.spyOn(messageRepository, "create").mockResolvedValue(mockMessage as any);
    vi.spyOn(messageRepository, "findOne").mockResolvedValue(null);
    vi.spyOn(chatRepository, "findById").mockResolvedValue({
      _id: new ObjectId(MOCK_CHAT_ID),
      participants: [new ObjectId(MOCK_USER_ID), new ObjectId(MOCK_RECEIVER_ID)],
      status: "accepted",
    } as any);
    vi.spyOn(chatRepository, "updateById").mockResolvedValue({
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

      // Delay the DB response to simulate concurrency
      let queryCount = 0;
      vi.spyOn(chatQueryRepository, "findPartnerChats").mockImplementation(async () => {
        queryCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return mockChats as any;
      });

      vi.spyOn(redisPresenceService, "getCachedPartners").mockResolvedValue(null);

      // Trigger 5 concurrent requests
      const results = await Promise.all([
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
      ]);

      expect(queryCount).toBe(1);
      results.forEach((res) => {
        expect(res).toBeInstanceOf(Set);
        expect(res.has("507f1f77bcf86cd799439088")).toBe(true);
        expect(res.has("507f1f77bcf86cd799439099")).toBe(true);
      });

      // Map should be empty after resolution
      expect((socketService as any).partnerRequests.size).toBe(0);
    });
  });

  describe("Redis Idempotency L1 Guard", () => {
    it("should skip DB findOne if Redis says the message is new", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = {
        chatId: MOCK_CHAT_ID,
        receiverId: MOCK_RECEIVER_ID,
        contentBody: "Hi",
        idempotencyKey: "unique-key",
      };

      vi.spyOn(redisGuardService, "checkAndSetIdempotency").mockResolvedValue(true);

      await socketService.saveAndDeliverMessage(sender, payload);

      // Should NOT have called messageRepo.findOne for idempotency
      expect(messageRepository.findOne).not.toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: "unique-key" }),
      );
      expect(messageRepository.create).toHaveBeenCalled();
    });

    it("should hit DB findOne if Redis says the message is a duplicate", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = {
        chatId: MOCK_CHAT_ID,
        receiverId: MOCK_RECEIVER_ID,
        contentBody: "Hi",
        idempotencyKey: "dup-key",
      };

      vi.spyOn(redisGuardService, "checkAndSetIdempotency").mockResolvedValue(false);
      const mockResult = {
        _id: new ObjectId("507f1f77bcf86cd799439077"),
        chatId: new ObjectId(MOCK_CHAT_ID),
        senderId: new ObjectId(MOCK_USER_ID),
        contentBody: "Hi",
        createdAt: new Date(),
        toObject: () => ({
          _id: new ObjectId("507f1f77bcf86cd799439077"),
          chatId: new ObjectId(MOCK_CHAT_ID),
          senderId: new ObjectId(MOCK_USER_ID),
          contentBody: "Hi",
          createdAt: new Date(),
          reactions: [],
        }),
      };
      vi.spyOn(messageRepository, "findOne").mockResolvedValue(mockResult as any);

      const result = await socketService.saveAndDeliverMessage(sender, payload);

      expect(messageRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "dup-key" }));
      expect(messageRepository.create).not.toHaveBeenCalled();
      expect(result.id.toString()).toBe("507f1f77bcf86cd799439077");
    });

    it("should NOT consume rate limit token for legitimate retries (duplicates)", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = {
        chatId: MOCK_CHAT_ID,
        receiverId: MOCK_RECEIVER_ID,
        contentBody: "Retry",
        idempotencyKey: "retry-key",
      };

      // Simulate Redis L1 hit for idempotency (already set)
      vi.spyOn(redisGuardService, "checkAndSetIdempotency").mockResolvedValue(false);
      // Simulate DB hit
      const mockResult = {
        _id: new ObjectId("507f1f77bcf86cd799439077"),
        chatId: new ObjectId(MOCK_CHAT_ID),
        senderId: new ObjectId(MOCK_USER_ID),
        contentBody: "Retry",
        createdAt: new Date(),
        toObject: () => ({
          _id: new ObjectId("507f1f77bcf86cd799439077"),
          chatId: new ObjectId(MOCK_CHAT_ID),
          senderId: new ObjectId(MOCK_USER_ID),
          contentBody: "Retry",
          createdAt: new Date(),
          reactions: [],
        }),
      };
      vi.spyOn(messageRepository, "findOne").mockResolvedValue(mockResult as any);

      await socketService.saveAndDeliverMessage(sender, payload);

      // Verify rate limit was NEVER checked for this duplicate
      expect(vi.spyOn(redisGuardService, "incrementAndCheckLimit")).not.toHaveBeenCalled();
    });
  });

  describe("Typing Local Guard", () => {
    it("should throttle Redis hits for high-frequency typing events", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "c1", receiverId: "r1" };

      // Mock cache to avoid DB hits
      chatCacheService.setParticipants("c1", new Set([MOCK_USER_ID, "r1"]));
      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      // 1. First call hits Redis
      await socketService.handleTyping(sender, payload, true);
      expect(vi.spyOn(redisGuardService, "incrementAndCheckLimit")).toHaveBeenCalledTimes(1);

      // 2. Immediate second call should NOT hit Redis (guarded locally)
      await socketService.handleTyping(sender, payload, true);
      expect(vi.spyOn(redisGuardService, "incrementAndCheckLimit")).toHaveBeenCalledTimes(1); // Still 1

      // 3. Advance time and it should hit Redis again
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 3000);

      await socketService.handleTyping(sender, payload, true);
      expect(vi.spyOn(redisGuardService, "incrementAndCheckLimit")).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
