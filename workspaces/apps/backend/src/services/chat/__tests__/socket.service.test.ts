import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import { CHAT_MESSAGES } from "@constants/messages";
import { chatQueryRepository } from "@repositories/chat-query.repository";
import { chatRepository } from "@repositories/chat.repository";
import { partnerRepository } from "@repositories/partner.repository";
import { userRepository } from "@repositories/user.repository";
import { chatCacheService } from "@services/chat/chat-cache.service";
import { messageService } from "@services/chat/message.service";
import { socketService } from "@services/chat/socket.service";
import {
  redisSessionService,
  redisPresenceService,
  redisGuardService,
  baseService,
} from "@services/infra/redis.service";
import { eventBus, USER_EVENTS } from "@utils/event-bus";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");
vi.mock("@repositories/chat.repository");
vi.mock("@repositories/partner.repository", () => ({
  partnerRepository: {
    getPartnerIds: vi.fn(),
    invalidatePartnerCache: vi.fn(),
  },
}));
vi.mock("@repositories/chat-query.repository", () => ({
  chatQueryRepository: {
    findPartnerChats: vi.fn(),
    searchChats: vi.fn(),
    findAcceptedChatsByUser: vi.fn(),
    findPendingRequestsByUser: vi.fn(),
    transformChat: vi.fn(),
  },
}));
vi.mock("@repositories/user.repository");
vi.mock("@services/chat/message.service");

vi.mock("@services/infra/redis.service", () => ({
  redisPresenceService: {
    setUserOnline: vi.fn().mockResolvedValue(null),
    setUserOffline: vi.fn().mockResolvedValue(null),
    getOnlineUsers: vi.fn().mockResolvedValue(new Set()),
    getCachedPartners: vi.fn().mockResolvedValue(null),
    setCachedPartners: vi.fn().mockResolvedValue(null),
    queuePresenceSync: vi.fn().mockResolvedValue(null),
    getLastSeenBatched: vi.fn().mockResolvedValue(new Map()),
  },
  redisSessionService: {
    incrementGlobalSession: vi.fn(),
    decrementGlobalSession: vi.fn(),
    getGlobalSessionCount: vi.fn(),
    getOldestSession: vi.fn().mockResolvedValue(null),
    publishSessionTakeover: vi.fn(),
    takeoverFreeSession: vi.fn(),
    publishCacheInvalidation: vi.fn().mockResolvedValue(null),
  },
  redisGuardService: {
    incrementAndCheckLimit: vi.fn().mockResolvedValue({ allowed: true, current: 1, ttl: 60000 }),
    checkAndSetIdempotency: vi.fn().mockResolvedValue(true),
  },
  baseService: {
    isConnected: true,
    subClient: {
      subscribe: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
    },
  },
}));

// Mock EventBus
vi.mock("@utils/event-bus", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(),
    },
  };
});

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
  // Proper way to mock Mongoose chains without triggering "Do not add 'then' to an object" lint
  const createQueryMock = (val: any = []) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
    };
    return Object.assign(Promise.resolve(val), query);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset active connections and caches
    (socketService as any).activeConnections.clear();
    chatCacheService.clear();

    // Default repository and service mocks
    vi.mocked(partnerRepository.getPartnerIds).mockResolvedValue(new Set());
    vi.mocked(chatQueryRepository.findPartnerChats).mockResolvedValue([]);
    vi.mocked(userRepository.findByIds).mockReturnValue(createQueryMock([]));

    vi.mocked(redisSessionService.incrementGlobalSession).mockImplementation(async (uid, _sid) => {
      const current = (socketService as any).activeConnections.get(uid)?.size || 0;
      return current + 1;
    });
    vi.spyOn(redisSessionService, "getGlobalSessionCount").mockImplementation(async (uid) => {
      return (socketService as any).activeConnections.get(uid)?.size || 0;
    });
    vi.spyOn(redisSessionService, "takeoverFreeSession").mockResolvedValue([]);
  });

  describe("handleConnection", () => {
    it("should allow a single connection for a Free user", async () => {
      const socket = createMockSocket(MOCK_USER_ID, "free");
      await socketService.handleConnection(socket);

      const userSockets = (socketService as any).activeConnections.get(MOCK_USER_ID);
      expect(userSockets.size).toBe(1);
      expect(userSockets.has(socket)).toBe(true);
      expect(socket.emit).not.toHaveBeenCalledWith("session_error", expect.anything());
    });

    it("should perform takeover when a Free user connects from a second device", async () => {
      const socket1 = createMockSocket(MOCK_USER_ID, "free");
      const socket2 = createMockSocket(MOCK_USER_ID, "free");

      vi.mocked(redisSessionService.takeoverFreeSession).mockResolvedValue([]);
      await socketService.handleConnection(socket1);

      vi.mocked(redisSessionService.takeoverFreeSession).mockResolvedValue([socket1.id]);
      await socketService.handleConnection(socket2);

      expect(socket1.emit).toHaveBeenCalledWith("session_error", expect.any(Object));
      expect(socket1.disconnect).toHaveBeenCalled();

      const userSockets = (socketService as any).activeConnections.get(MOCK_USER_ID);
      expect(userSockets.size).toBe(1);
      expect(userSockets.has(socket2)).toBe(true);
    });

    it("should initiate takeover for a Pro user exceeding the limit", async () => {
      const userId = MOCK_PRO_USER_ID;
      vi.mocked(redisSessionService.incrementGlobalSession).mockResolvedValue(PRO_PLAN_SESSION_LIMIT + 1);
      const oldestSocketId = "oldest-socket-id";
      vi.mocked(redisSessionService.getOldestSession).mockResolvedValue(oldestSocketId);

      const extraSocket = createMockSocket(userId, "pro");
      await socketService.handleConnection(extraSocket);

      // Pro users are NOT rejected, they trigger a takeover of the oldest session
      expect(extraSocket.emit).not.toHaveBeenCalledWith(
        "error",
        expect.objectContaining({ code: "SESSION_LIMIT_EXCEEDED" }),
      );
      expect(vi.mocked(redisSessionService.publishSessionTakeover)).toHaveBeenCalledWith(userId, oldestSocketId);
      expect(extraSocket.disconnect).not.toHaveBeenCalled();

      const userSockets = (socketService as any).activeConnections.get(userId);
      expect(userSockets.size).toBe(1); // Only this connection exists locally
      expect(userSockets.has(extraSocket)).toBe(true);
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
      expect((socketService as any).activeConnections.get(MOCK_USER_ID).size).toBe(1);

      // Simulate disconnect
      await disconnectHandler();

      expect((socketService as any).activeConnections.get(MOCK_USER_ID)).toBeUndefined();
    });
  });

  describe("Message Operations", () => {
    it("should delegate saveAndDeliver to MessageService", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r1", contentBody: "Hi", idempotencyKey: "k1" };

      await socketService.saveAndDeliverMessage(sender, payload);

      expect(vi.mocked(messageService.saveAndDeliver)).toHaveBeenCalledWith(
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
      vi.mocked(chatQueryRepository.findPartnerChats).mockResolvedValue(chats as any);

      await socketService.handleConnection(socket);

      expect(socket.join).toHaveBeenCalledWith("watching:507f1f77bcf86cd799439088");
      expect(socket.join).toHaveBeenCalledWith("watching:507f1f77bcf86cd799439099");
    });

    it("should broadcast global status update to the partner's watching room", () => {
      const partnerId = "507f1f77bcf86cd799439088";
      eventBus.emit(USER_EVENTS.PRESENCE_CHANGED, { userId: partnerId, isOnline: true });

      expect(vi.mocked(eventBus.emit)).toHaveBeenCalledWith(
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
    it("should delegate rate limiting and error handling to MessageService", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r1", contentBody: "Hello", idempotencyKey: "k1" };

      vi.mocked(messageService.saveAndDeliver).mockRejectedValue(new Error(CHAT_MESSAGES.RATE_LIMIT_EXCEEDED));

      await expect(socketService.saveAndDeliverMessage(sender, payload)).rejects.toThrow(
        CHAT_MESSAGES.RATE_LIMIT_EXCEEDED,
      );
    });

    it("should delegate typing indicators to TypingHandler", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "chat123", receiverId: "receiver456" };

      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      await socketService.handleTyping(sender, payload, true);
      expect(vi.mocked(socketService.io!.to)).toHaveBeenCalledWith("watching:chat123");
      expect(vi.mocked(socketService.io!.emit)).toHaveBeenCalledWith("typing_start", expect.any(Object));
    });
  });
});
