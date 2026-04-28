import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import { socketService } from "@services/socket.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");
vi.mock("@services/redis.service", () => ({
  redisService: {
    incrementGlobalSession: vi.fn(),
    decrementGlobalSession: vi.fn(),
    getGlobalSessionCount: vi.fn(),
    publishSessionTakeover: vi.fn(),
    setUserOnline: vi.fn().mockResolvedValue(null),
    setUserOffline: vi.fn().mockResolvedValue(null),
    getOnlineUsers: vi.fn().mockResolvedValue(new Set()),
    getCachedPartners: vi.fn().mockResolvedValue(null),
    setCachedPartners: vi.fn().mockResolvedValue(null),
    invalidatePartnerCache: vi.fn().mockResolvedValue(null),
    subClient: {
      subscribe: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
    },
    isConnected: true,
    incrementAndCheckLimit: vi.fn().mockResolvedValue({ allowed: true, current: 1, ttl: 60000 }),
    checkAndSetIdempotency: vi.fn().mockResolvedValue(true),
    getLastSeenBatched: vi.fn().mockResolvedValue(new Map()),
    lockChat: vi.fn().mockResolvedValue(null),
    unlockChat: vi.fn().mockResolvedValue(null),
    isChatLocked: vi.fn().mockResolvedValue(false),
    publishCacheInvalidation: vi.fn().mockResolvedValue(null),
    queuePresenceSync: vi.fn().mockResolvedValue(null),
    queuePresenceSyncBatched: vi.fn().mockResolvedValue(null),
    getSyncQueueCount: vi.fn().mockResolvedValue(0),
    popSyncQueue: vi.fn().mockResolvedValue([]),
    isUserOnline: vi.fn().mockResolvedValue(false),
  },
}));

import Chat from "@models/chat.model";
import Message from "@models/message.model";
import User from "@models/user.model";
import { redisService } from "@services/redis.service";

// Mock Socket instance
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
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset active connections
    (socketService as any).activeConnections.clear();

    // Proper way to mock Mongoose chains without triggering "Do not add 'then' to an object" lint
    const createQueryMock = (val: any = []) => {
      const query = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
      };
      return Object.assign(Promise.resolve(val), query);
    };

    vi.mocked(Chat.find).mockReturnValue(createQueryMock([]) as any);
    vi.mocked(Chat.findOne).mockReturnValue(createQueryMock(null) as any);
    vi.mocked(Chat.findOneAndUpdate).mockReturnValue(createQueryMock(null) as any);
    vi.mocked(User.find).mockReturnValue(createQueryMock([]) as any);
    vi.mocked(User.findById).mockReturnValue(createQueryMock(null) as any);

    vi.mocked(Message.find).mockReturnValue(createQueryMock([]) as any);
    vi.mocked(Message.findOne).mockReturnValue(createQueryMock(null) as any);
    vi.mocked(Message.create).mockImplementation((data: any) =>
      Promise.resolve({
        ...data,
        _id: "new-msg-id",
        createdAt: new Date(),
        toObject: () => ({ ...data, _id: "new-msg-id", createdAt: new Date(), reactions: [] }),
      }),
    );
    vi.mocked(Message.findById).mockResolvedValue(null as any);
    vi.mocked(Message.findByIdAndDelete).mockResolvedValue(null as any);

    vi.mocked(User.findByIdAndUpdate).mockResolvedValue({} as any);

    // Default redis mocks
    vi.mocked(redisService.incrementGlobalSession).mockImplementation(async (uid, sid) => {
      const current = (socketService as any).activeConnections.get(uid)?.size || 0;
      return current + 1;
    });
    vi.mocked(redisService.getGlobalSessionCount).mockImplementation(async (uid) => {
      return (socketService as any).activeConnections.get(uid)?.size || 0;
    });
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

      // First connection
      await socketService.handleConnection(socket1);
      expect((socketService as any).activeConnections.get(MOCK_USER_ID).size).toBe(1);

      // Second connection (Takeover)
      await socketService.handleConnection(socket2);

      // Verify socket1 was notified and disconnected
      expect(socket1.emit).toHaveBeenCalledWith(
        "session_error",
        expect.objectContaining({
          reason: "takeover",
        }),
      );
      expect(socket1.disconnect).toHaveBeenCalled();

      // Verify active connections only contains socket2
      const userSockets = (socketService as any).activeConnections.get(MOCK_USER_ID);
      expect(userSockets.size).toBe(1);
      expect(userSockets.has(socket2)).toBe(true);
    });

    it("should allow multiple connections for a Pro user up to the limit", async () => {
      const userId = MOCK_PRO_USER_ID;
      const sockets: any[] = [];

      // Connect up to limit
      for (let i = 0; i < PRO_PLAN_SESSION_LIMIT; i++) {
        const s = createMockSocket(userId, "pro");
        sockets.push(s);
        await socketService.handleConnection(s);
      }

      const userSockets = (socketService as any).activeConnections.get(userId);
      expect(userSockets.size).toBe(PRO_PLAN_SESSION_LIMIT);

      sockets.forEach((s) => {
        expect(s.disconnect).not.toHaveBeenCalled();
      });
    });

    it("should reject connection for a Pro user exceeding the limit", async () => {
      const userId = MOCK_PRO_USER_ID;

      // Connect to limit
      for (let i = 0; i < PRO_PLAN_SESSION_LIMIT; i++) {
        await socketService.handleConnection(createMockSocket(userId, "pro"));
      }

      // Try one more
      const extraSocket = createMockSocket(userId, "pro");
      // Simulate Redis count being over the limit
      vi.mocked(redisService.incrementGlobalSession).mockResolvedValue(PRO_PLAN_SESSION_LIMIT + 1);

      await socketService.handleConnection(extraSocket);

      expect(extraSocket.emit).toHaveBeenCalledWith(
        "error",
        expect.objectContaining({
          message: expect.stringMatching(/limit reached/),
        }),
      );
      expect(extraSocket.disconnect).toHaveBeenCalled();

      const userSockets = (socketService as any).activeConnections.get(userId);
      expect(userSockets.size).toBe(PRO_PLAN_SESSION_LIMIT);
      expect(userSockets.has(extraSocket)).toBe(false);
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
    it("should deliver message and update chat atomically", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro", name: "Sender", username: "sender" } as any;
      const payload = {
        chatId: "chat123",
        receiverId: "receiver456",
        contentBody: "Hello",
        idempotencyKey: "unique123",
      };

      const mockMessage = {
        _id: "msg123",
        chatId: "chat123",
        senderId: MOCK_USER_ID,
        contentBody: "Hello",
        createdAt: new Date(),
        toObject: () => ({
          _id: "msg123",
          chatId: "chat123",
          senderId: MOCK_USER_ID,
          contentBody: "Hello",
          reactions: [],
        }),
      };

      const mockChat = {
        _id: "chat123",
        participants: [MOCK_USER_ID, "receiver456"],
        userA: MOCK_USER_ID,
        userB: "receiver456",
        status: "accepted",
      };

      vi.mocked(Chat.findOneAndUpdate).mockResolvedValue(mockChat as any);
      vi.mocked(Message.create).mockResolvedValue(mockMessage as any);
      vi.mocked(Message.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      const result = await socketService.saveAndDeliverMessage(sender, payload);

      expect(result.id).toBe("msg123");
      expect(Chat.findOneAndUpdate).toHaveBeenCalled();
      expect(socketService.io?.to).toHaveBeenCalledWith("user:receiver456");
      expect(socketService.io?.emit).toHaveBeenCalledWith("receive_message", expect.any(Object));
    });

    it("should return existing message on idempotency match", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "c1", idempotencyKey: "existing-key" } as any;
      const existing = { _id: "old-msg", chatId: "c1", senderId: "s1", toObject: () => ({}) } as any;

      vi.mocked(redisService.checkAndSetIdempotency).mockResolvedValue(false);
      vi.mocked(Message.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(existing),
      } as any);

      const result = await socketService.saveAndDeliverMessage(sender, payload);

      expect(result.id).toBe("old-msg");
      expect(Message.create).not.toHaveBeenCalled();
    });
  });

  describe("Presence & Status (Room-based)", () => {
    it("should join rooms for all partners on connection", async () => {
      const userId = "user1";
      const partnerIds = new Set(["p1", "p2"]);
      const socket = createMockSocket(userId, "pro");

      // Mock partner fetching
      vi.spyOn(socketService as any, "_getPartnerIds").mockResolvedValue(partnerIds);

      await socketService.handleConnection(socket);

      expect(socket.join).toHaveBeenCalledWith("watching:p1");
      expect(socket.join).toHaveBeenCalledWith("watching:p2");
    });

    it("should broadcast global status update to the partner's watching room", () => {
      const partnerId = "partnerA";
      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      (socketService as any).presenceService.handleGlobalStatusUpdate(partnerId, true);

      expect(socketService.io?.to).toHaveBeenCalledWith(`watching:${partnerId}`);
      expect(socketService.io?.emit).toHaveBeenCalledWith(
        "user_status",
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

      // Seed the cache
      (socketService as any).participantCache.set(chatId, participants);
      expect((socketService as any).participantCache.get(chatId)).toBe(participants);

      // Trigger global invalidation
      (socketService as any)._handleGlobalCacheInvalidation("chat", chatId);

      // Verify it's cleared
      expect((socketService as any).participantCache.get(chatId)).toBeUndefined();
    });

    it("should ignore unknown invalidation types", () => {
      const chatId = "chat-123";
      const participants = new Set(["u1", "u2"]);
      (socketService as any).participantCache.set(chatId, participants);

      (socketService as any)._handleGlobalCacheInvalidation("unknown-type", chatId);

      expect((socketService as any).participantCache.get(chatId)).toBe(participants);
    });
  });

  describe("Throttling & Rate Limiting", () => {
    it("should block message delivery if rate limit is exceeded", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r1", contentBody: "Hello", idempotencyKey: "k1" };

      vi.mocked(redisService.incrementAndCheckLimit).mockResolvedValue({ allowed: false, current: 101, ttl: 60000 });

      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      await expect(socketService.saveAndDeliverMessage(sender, payload)).rejects.toThrow(
        "Message sending limit reached.",
      );

      expect(socketService.io?.emit).toHaveBeenCalledWith(
        "error",
        expect.objectContaining({
          code: "RATE_LIMIT_EXCEEDED",
        }),
      );
      expect(Message.create).not.toHaveBeenCalled();
    });

    it("should throttle typing indicators", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "chat123", receiverId: "receiver456" };

      // Seed participant cache to avoid DB hit
      (socketService as any).participantCache.set("chat123", new Set([MOCK_USER_ID, "receiver456"]));

      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      // Reset local guard to ensure Redis hit
      (socketService as any).typingHandler.localGuard.clear();

      vi.mocked(redisService.incrementAndCheckLimit).mockResolvedValue({ allowed: true, current: 1, ttl: 60000 });
      await socketService.handleTyping(sender, payload, true);
      expect(socketService.io?.emit).toHaveBeenCalledWith("typing_start", expect.any(Object));

      // 2. Throttled call - MUST bypass local guard to hit Redis and fail
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 3000);

      vi.mocked(redisService.incrementAndCheckLimit).mockResolvedValue({ allowed: false, current: 61, ttl: 60000 });
      vi.mocked(socketService.io!.emit).mockClear();
      await socketService.handleTyping(sender, payload, true);
      expect(socketService.io?.emit).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
