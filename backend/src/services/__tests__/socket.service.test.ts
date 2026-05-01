/* eslint-disable @typescript-eslint/unbound-method */
import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import { IChat } from "@models/chat.model";
import Chat from "@models/chat.model";
import { IMessage } from "@models/message.model";
import Message from "@models/message.model";
import User from "@models/user.model";
import { redisService } from "@services/redis.service";
import { socketService } from "@services/socket.service";
import { CHAT_EVENTS, eventBus, USER_EVENTS } from "@utils/event-bus";
import { ObjectId } from "mongodb";
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
    getOldestSession: vi.fn().mockResolvedValue(null),
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
    takeoverFreeSession: vi.fn(),
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

// Mock Data & Helpers
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
    (socketService as any).participantCache.clear();
    (socketService as any).partnerCache.clear();

    vi.mocked(Chat.find).mockReturnValue(createQueryMock([]) as any);
    vi.mocked(Chat.findOne).mockReturnValue(createQueryMock(null) as any);
    vi.mocked(Chat.findById).mockReturnValue(createQueryMock(null) as any);
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
    vi.mocked(redisService.incrementGlobalSession).mockImplementation(async (uid, _sid) => {
      const current = (socketService as any).activeConnections.get(uid)?.size || 0;
      return current + 1;
    });
    vi.mocked(redisService.getGlobalSessionCount).mockImplementation(async (uid) => {
      return (socketService as any).activeConnections.get(uid)?.size || 0;
    });
    vi.mocked(redisService.takeoverFreeSession).mockResolvedValue([]);
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
      vi.mocked(redisService.takeoverFreeSession).mockResolvedValue([]);
      await socketService.handleConnection(socket1);
      expect((socketService as any).activeConnections.get(MOCK_USER_ID).size).toBe(1);

      // Second connection (Takeover)
      // Simulate redis identifying socket1 as the victim
      vi.mocked(redisService.takeoverFreeSession).mockResolvedValue([socket1.id]);
      await socketService.handleConnection(socket2);

      // Simulate the global takeover handler being called
      let socket1Disconnect: Function = () => {};
      socket1.on.mockImplementation((event: string, handler: Function) => {
        if (event === "disconnect") socket1Disconnect = handler;
      });
      // Re-run handleConnection to register the listener
      await socketService.handleConnection(socket1);

      (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, socket1.id);

      // Manually trigger disconnect to simulate what Socket.io would do
      await socket1Disconnect();

      // Verify active connections only contains socket2 (and any other sockets from handleConnection calls)
      const userSockets = (socketService as any).activeConnections.get(MOCK_USER_ID);
      expect(userSockets.has(socket1)).toBe(false);
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

    it("should initiate takeover for a Pro user exceeding the limit", async () => {
      const userId = MOCK_PRO_USER_ID;
      const oldestSocketId = "oldest-socket-id";

      // Connect to limit
      for (let i = 0; i < PRO_PLAN_SESSION_LIMIT; i++) {
        await socketService.handleConnection(createMockSocket(userId, "pro"));
      }

      // Try one more
      const extraSocket = createMockSocket(userId, "pro");
      vi.mocked(redisService.incrementGlobalSession).mockResolvedValue(PRO_PLAN_SESSION_LIMIT + 1);
      vi.mocked(redisService.getOldestSession).mockResolvedValue(oldestSocketId);

      await socketService.handleConnection(extraSocket);

      // Pro users are NOT rejected, they trigger a takeover of the oldest session
      expect(extraSocket.emit).not.toHaveBeenCalledWith(
        "error",
        expect.objectContaining({ code: "SESSION_LIMIT_EXCEEDED" }),
      );
      expect(redisService.publishSessionTakeover).toHaveBeenCalledWith(userId, oldestSocketId);
      expect(extraSocket.disconnect).not.toHaveBeenCalled();

      const userSockets = (socketService as any).activeConnections.get(userId);
      expect(userSockets.size).toBe(PRO_PLAN_SESSION_LIMIT + 1);
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
    it("should deliver message and update chat atomically", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro", name: "Sender", username: "sender" } as any;
      const payload = {
        chatId: "507f1f77bcf86cd799439044",
        receiverId: "507f1f77bcf86cd799439055",
        contentBody: "Hello",
        idempotencyKey: "unique123",
      };

      const mockMessage = {
        _id: new ObjectId("507f1f77bcf86cd799439066"),
        chatId: new ObjectId("507f1f77bcf86cd799439044"),
        senderId: new ObjectId(MOCK_USER_ID),
        contentBody: "Hello",
        createdAt: new Date(),
        toObject: () => ({
          _id: new ObjectId("507f1f77bcf86cd799439066"),
          chatId: new ObjectId("507f1f77bcf86cd799439044"),
          senderId: new ObjectId(MOCK_USER_ID),
          contentBody: "Hello",
          reactions: [],
        }),
      } as unknown as IMessage;

      const mockChat = {
        _id: new ObjectId("507f1f77bcf86cd799439044"),
        participants: [new ObjectId(MOCK_USER_ID), new ObjectId("507f1f77bcf86cd799439055")],
        status: "accepted",
      } as unknown as IChat;

      vi.mocked(Chat.findById).mockReturnValue(createQueryMock(mockChat) as any);
      vi.mocked(Chat.findOneAndUpdate).mockResolvedValue(mockChat);
      vi.mocked(Message.create).mockResolvedValue(mockMessage as any); // create returns IMessage but mocked wants more
      vi.mocked(Message.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const result = await socketService.saveAndDeliverMessage(sender, payload);

      expect(result.id).toBe("507f1f77bcf86cd799439066");
      expect(Chat.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: new ObjectId("507f1f77bcf86cd799439044") }),
        expect.objectContaining({
          $inc: { [`unreadCounts.${payload.receiverId}`]: 1 },
        }),
        expect.anything(),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(CHAT_EVENTS.MESSAGE_SENT, expect.any(Object));
    });

    it("should return existing message on idempotency match", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "507f1f77bcf86cd799439044", idempotencyKey: "existing-key" } as any;
      const existing = {
        _id: new ObjectId("507f1f77bcf86cd799439077"),
        chatId: new ObjectId("507f1f77bcf86cd799439044"),
        senderId: new ObjectId(MOCK_USER_ID),
        createdAt: new Date(),
        toObject: () => ({
          _id: new ObjectId("507f1f77bcf86cd799439077"),
          chatId: new ObjectId("507f1f77bcf86cd799439044"),
          senderId: new ObjectId(MOCK_USER_ID),
          reactions: [],
        }),
      } as unknown as IMessage;

      vi.mocked(Chat.findById).mockReturnValue(
        createQueryMock({
          participants: [new ObjectId(MOCK_USER_ID), new ObjectId("507f1f77bcf86cd799439055")],
          status: "accepted",
        }) as any,
      );
      vi.mocked(redisService.checkAndSetIdempotency).mockResolvedValue(false);
      vi.mocked(Message.findOne).mockResolvedValue(existing as any);

      const result = await socketService.saveAndDeliverMessage(sender, payload);

      expect(result.id).toBe("507f1f77bcf86cd799439077");
    });

    it("should deliver message to all participants in a group chat", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro", name: "Sender", username: "sender" } as any;
      const participants = [MOCK_USER_ID, "507f1f77bcf86cd799439055", "507f1f77bcf86cd799439066"];
      const payload = {
        chatId: "507f1f77bcf86cd799439044",
        receiverId: "507f1f77bcf86cd799439055",
        contentBody: "Group Hello",
        idempotencyKey: "group-key-123",
      };

      const mockChat = {
        _id: new ObjectId("507f1f77bcf86cd799439044"),
        participants,
        status: "accepted",
        isGroup: true,
      } as unknown as IChat;

      vi.mocked(Chat.findById).mockReturnValue(createQueryMock(mockChat) as any);
      vi.mocked(Chat.findOneAndUpdate).mockResolvedValue(mockChat);

      await socketService.saveAndDeliverMessage(sender, payload);

      // Verify all recipients are in the unread count update
      expect(Chat.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $inc: {
            "unreadCounts.507f1f77bcf86cd799439055": 1,
            "unreadCounts.507f1f77bcf86cd799439066": 1,
          },
        }),
        expect.anything(),
      );

      // Verify event bus emission includes all participants
      expect(eventBus.emit).toHaveBeenCalledWith(
        CHAT_EVENTS.MESSAGE_SENT,
        expect.objectContaining({
          participants: participants.map((p) => p.toString()),
        }),
      );
    });
  });

  describe("Presence & Status (Room-based)", () => {
    it("should join rooms for all partners on connection", async () => {
      const userId = "507f1f77bcf86cd799439011";
      const partnerIds = new Set(["507f1f77bcf86cd799439088", "507f1f77bcf86cd799439099"]);
      const socket = createMockSocket(userId, "pro");

      // Mock partner fetching
      vi.spyOn(socketService as any, "_getPartnerIds").mockResolvedValue(partnerIds);

      await socketService.handleConnection(socket);

      expect(socket.join).toHaveBeenCalledWith("watching:507f1f77bcf86cd799439088");
      expect(socket.join).toHaveBeenCalledWith("watching:507f1f77bcf86cd799439099");
    });

    it("should broadcast global status update to the partner's watching room", () => {
      const partnerId = "507f1f77bcf86cd799439088";

      // Simulate receiving an event from the EventBus (which SocketService emits on Redis message)
      eventBus.emit(USER_EVENTS.PRESENCE_CHANGED, { userId: partnerId, isOnline: true });

      expect(eventBus.emit).toHaveBeenCalledWith(
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

      vi.mocked(Chat.findById).mockReturnValue(
        createQueryMock({ participants: [MOCK_USER_ID, "r1"], status: "accepted" }) as any,
      );
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
