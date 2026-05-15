import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import { CHAT_MESSAGES } from "@constants/messages";
import { SocketService } from "@services/chat/socket.service";
import { eventBus, USER_EVENTS } from "@utils/event-bus";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");

const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_PRO_USER_ID = "507f1f77bcf86cd799439022";

const createMockSocket = (userId: string, plan: "free" | "pro") =>
  ({
    id: `socket-${Math.random()}`,
    data: {
      user: {
        id: userId,
        plan: plan,
        username: `user_${userId}`,
        name: `User ${userId}`,
        avatarUrl: "http://example.com/avatar.png",
      },
    },
    join: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
  }) as any;

describe("SocketService", () => {
  let socketService: SocketService;
  let chatCacheService: any;
  let mockChatRepo: any;
  let mockMessageRepo: any;
  let mockUserRepo: any;
  let mockChatQueryRepo: any;
  let mockPartnerRepo: any;
  let mockMessageService: any;
  let mockRedisSessionService: any;
  let mockRedisPresenceService: any;
  let mockRedisBaseService: any;
  let mockPolicyService: any;
  let mockPresenceService: any;
  let mockMessageHandler: any;
  let mockReactionHandler: any;
  let mockTypingHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const cacheStore = new Map<string, Set<string>>();
    const partnerStore = new Map<string, Set<string>>();
    chatCacheService = {
      getParticipants: vi.fn((key: string) => cacheStore.get(key)),
      setParticipants: vi.fn((key: string, val: Set<string>) => cacheStore.set(key, val)),
      invalidateParticipants: vi.fn((key: string) => cacheStore.delete(key)),
      getPartners: vi.fn((key: string) => partnerStore.get(key)),
      setPartners: vi.fn((key: string, val: Set<string>) => partnerStore.set(key, val)),
      invalidatePartners: vi.fn((key: string) => {
        partnerStore.delete(key);
        partnerStore.delete(`${key}:active`);
      }),
    };
    mockChatRepo = { findById: vi.fn() };
    mockMessageRepo = { create: vi.fn() };
    mockUserRepo = { findByIds: vi.fn() };
    mockChatQueryRepo = {
      findPartnerChats: vi.fn(),
      searchChats: vi.fn(),
      findAcceptedChatsByUser: vi.fn(),
      findPendingRequestsByUser: vi.fn(),
      transformChat: vi.fn(),
    };
    mockPartnerRepo = {
      getPartnerIds: vi.fn(),
      invalidatePartnerCache: vi.fn(),
    };
    mockMessageService = {
      getChatMessages: vi.fn(),
      markChatRead: vi.fn(),
      saveAndDeliver: vi.fn(),
      deleteMessage: vi.fn(),
      editMessage: vi.fn(),
      invalidateCache: vi.fn(),
      ensureParticipant: vi.fn(),
    };
    mockPresenceService = {
      notifyStatusChange: vi.fn(),
      getPartnersStatusBatch: vi.fn().mockResolvedValue([]),
    };
    mockMessageHandler = {
      saveAndDeliver: vi.fn(),
      handleDelete: vi.fn(),
      handleEdit: vi.fn(),
    };
    mockReactionHandler = {
      handleReaction: vi.fn(),
    };
    mockTypingHandler = {
      handleTyping: vi.fn(),
    };
    mockRedisSessionService = {
      incrementGlobalSession: vi.fn(),
      decrementGlobalSession: vi.fn(),
      getGlobalSessionCount: vi.fn(),
      getOldestSession: vi.fn(),
      publishSessionTakeover: vi.fn(),
      takeoverFreeSession: vi.fn(),
      publishCacheInvalidation: vi.fn(),
    };
    mockRedisPresenceService = {
      setUserOnline: vi.fn().mockResolvedValue(null),
      setUserOffline: vi.fn().mockResolvedValue(null),
      getOnlineUsers: vi.fn().mockResolvedValue(new Set()),
      getLastSeenBatched: vi.fn().mockResolvedValue(new Map()),
      getCachedPartners: vi.fn().mockResolvedValue(null),
      setCachedPartners: vi.fn().mockResolvedValue(null),
      queuePresenceSync: vi.fn().mockResolvedValue(null),
    };
    mockRedisBaseService = {
      isConnected: true,
      subClient: { subscribe: vi.fn().mockResolvedValue(null), on: vi.fn() },
    };
    mockPolicyService = {
      isSessionLimitReached: vi.fn().mockReturnValue(false),
    };

    socketService = new SocketService(
      mockChatRepo,
      mockMessageRepo,
      mockUserRepo,
      mockChatQueryRepo,
      mockMessageService,
      mockPresenceService,
      mockMessageHandler,
      mockReactionHandler,
      mockTypingHandler,
      mockRedisSessionService,
      mockRedisPresenceService,
      mockRedisBaseService,
      mockPolicyService,
      chatCacheService,
    );

    // Reset active connections
    socketService.activeConnections.clear();

    // Default repository and service mocks
    mockPartnerRepo.getPartnerIds.mockResolvedValue(new Set());
    mockChatQueryRepo.findPartnerChats.mockResolvedValue([]);
    mockUserRepo.findByIds = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });

    mockRedisSessionService.incrementGlobalSession.mockImplementation(async (uid: string) => {
      const current = socketService.activeConnections.get(uid)?.size || 0;
      return current + 1;
    });
    mockRedisSessionService.getGlobalSessionCount.mockImplementation(async (uid: string) => {
      return socketService.activeConnections.get(uid)?.size || 0;
    });
    mockRedisSessionService.takeoverFreeSession.mockResolvedValue([]);
  });

  describe("handleConnection", () => {
    it("should allow a single connection for a Free user", async () => {
      const socket = createMockSocket(MOCK_USER_ID, "free");
      await socketService.handleConnection(socket);

      const userSockets = socketService.activeConnections.get(MOCK_USER_ID);
      expect(userSockets!.size).toBe(1);
      expect(userSockets!.has(socket)).toBe(true);
      expect(socket.emit).not.toHaveBeenCalledWith("session_error", expect.anything());
    });

    it("should perform takeover when a Free user connects from a second device", async () => {
      const socket1 = createMockSocket(MOCK_USER_ID, "free");
      const socket2 = createMockSocket(MOCK_USER_ID, "free");

      vi.mocked(mockRedisSessionService.takeoverFreeSession).mockResolvedValue([]);
      await socketService.handleConnection(socket1);

      vi.mocked(mockRedisSessionService.takeoverFreeSession).mockResolvedValue([socket1.id]);
      await socketService.handleConnection(socket2);

      expect(socket1.emit).toHaveBeenCalledWith("session_error", expect.any(Object));
      expect(socket1.disconnect).toHaveBeenCalled();

      const userSockets = socketService.activeConnections.get(MOCK_USER_ID);
      expect(userSockets!.size).toBe(1);
      expect(userSockets!.has(socket2)).toBe(true);
    });

    it("should initiate takeover for a Pro user exceeding the limit", async () => {
      const userId = MOCK_PRO_USER_ID;
      mockPolicyService.isSessionLimitReached.mockImplementation(
        (plan: string, count: number) => plan === "pro" && count > PRO_PLAN_SESSION_LIMIT,
      );
      vi.mocked(mockRedisSessionService.incrementGlobalSession).mockResolvedValue(PRO_PLAN_SESSION_LIMIT + 1);
      const oldestSocketId = "oldest-socket-id";
      vi.mocked(mockRedisSessionService.getOldestSession).mockResolvedValue(oldestSocketId);

      const extraSocket = createMockSocket(userId, "pro");
      await socketService.handleConnection(extraSocket);

      expect(extraSocket.emit).not.toHaveBeenCalledWith(
        "error",
        expect.objectContaining({ code: "SESSION_LIMIT_EXCEEDED" }),
      );
      expect(vi.mocked(mockRedisSessionService.publishSessionTakeover)).toHaveBeenCalledWith(userId, oldestSocketId);
      expect(extraSocket.disconnect).not.toHaveBeenCalled();

      const userSockets = socketService.activeConnections.get(userId);
      expect(userSockets!.size).toBe(1);
      expect(userSockets!.has(extraSocket)).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("should clean up connection set on disconnect", async () => {
      const socket = createMockSocket(MOCK_USER_ID, "free");
      let disconnectHandler: Function = () => {};
      socket.on.mockImplementation((event: string, handler: Function) => {
        if (event === "disconnect") disconnectHandler = handler;
      });

      await socketService.handleConnection(socket);
      expect(socketService.activeConnections.get(MOCK_USER_ID)!.size).toBe(1);

      // Simulate disconnect
      await disconnectHandler();

      expect(socketService.activeConnections.get(MOCK_USER_ID)).toBeUndefined();
    });
  });

  describe("Message Operations", () => {
    it("should delegate saveAndDeliver to MessageHandler", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r1", contentBody: "Hi", idempotencyKey: "k1" };

      await socketService.saveAndDeliverMessage(sender, payload);

      expect(mockMessageHandler.saveAndDeliver).toHaveBeenCalledWith(
        expect.objectContaining({ id: MOCK_USER_ID }),
        payload,
      );
    });
  });

  describe("Presence & Status", () => {
    it("should join rooms for all partners on connection", async () => {
      const userId = "507f1f77bcf86cd799439011";
      const partnerIds = new Set(["507f1f77bcf86cd799439088", "507f1f77bcf86cd799439099"]);
      const socket = createMockSocket(userId, "pro");

      const chats = [
        { _id: new ObjectId(), participants: [userId, "507f1f77bcf86cd799439088"] },
        { _id: new ObjectId(), participants: [userId, "507f1f77bcf86cd799439099"] },
      ];
      vi.mocked(mockChatQueryRepo.findPartnerChats).mockResolvedValue(chats as any);

      await socketService.handleConnection(socket);

      expect(socket.join).toHaveBeenCalledWith("watching:507f1f77bcf86cd799439088");
      expect(socket.join).toHaveBeenCalledWith("watching:507f1f77bcf86cd799439099");
    });

    it("should broadcast global status update to the partner's watching room", () => {
      const emitSpy = vi.spyOn(eventBus, "emit");
      const partnerId = "507f1f77bcf86cd799439088";
      eventBus.emit(USER_EVENTS.PRESENCE_CHANGED, { userId: partnerId, isOnline: true });

      expect(emitSpy).toHaveBeenCalledWith(
        USER_EVENTS.PRESENCE_CHANGED,
        expect.objectContaining({
          userId: partnerId,
          isOnline: true,
        }),
      );
    });
  });

  describe("Distributed Cache Invalidation", () => {
    it("should clear participant cache when receiving global chat invalidation signal", () => {
      const chatId = "hot-chat-123";
      const participants = new Set(["u1", "u2"]);

      chatCacheService.setParticipants(chatId, participants);
      (socketService as any)._handleGlobalCacheInvalidation("chat", chatId);

      expect(chatCacheService.getParticipants(chatId)).toBeUndefined();
    });

    it("should ignore unknown invalidation types", () => {
      const chatId = "chat-123";
      const participants = new Set(["u1", "u2"]);
      chatCacheService.setParticipants(chatId, participants);

      (socketService as any)._handleGlobalCacheInvalidation("unknown-type", chatId);

      expect(chatCacheService.getParticipants(chatId)).toBe(participants);
    });
  });

  describe("Throttling & Rate Limiting", () => {
    it("should delegate rate limiting and error handling to MessageHandler", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r1", contentBody: "Hello", idempotencyKey: "k1" };

      mockMessageHandler.saveAndDeliver.mockRejectedValue(new Error(CHAT_MESSAGES.RATE_LIMIT_EXCEEDED));

      await expect(socketService.saveAndDeliverMessage(sender, payload)).rejects.toThrow(
        CHAT_MESSAGES.RATE_LIMIT_EXCEEDED,
      );
    });

    it("should delegate typing indicators to TypingHandler", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "chat123", receiverId: "receiver456" };

      await socketService.handleTyping(sender, payload, true);

      expect(mockTypingHandler.handleTyping).toHaveBeenCalledWith(sender, payload, true);
    });
  });
});
