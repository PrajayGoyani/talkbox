import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { socketService } from "../socket.service";

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
    
    // Explicitly mock methods on the service's model reference
    (socketService as any).Message.find = vi.fn().mockReturnValue(createQueryMock([]));
    (socketService as any).Message.findOne = vi.fn().mockReturnValue(createQueryMock(null));
    (socketService as any).Message.create = vi.fn();
    (socketService as any).Message.findById = vi.fn();
    (socketService as any).Message.findByIdAndDelete = vi.fn();
    
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
        toObject: () => ({ _id: "msg123", chatId: "chat123", senderId: MOCK_USER_ID, contentBody: "Hello", reactions: [] }),
      };

      const mockChat = {
        _id: "chat123",
        userA: MOCK_USER_ID,
        userB: "receiver456",
        status: "accepted",
      };

      vi.mocked(Chat.findOneAndUpdate).mockResolvedValue(mockChat as any);
      (socketService as any).Message.create.mockResolvedValue(mockMessage as any);
      (socketService as any).Message.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
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

      vi.mocked(socketService.Message.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(existing)
      } as any);

      const result = await socketService.saveAndDeliverMessage(sender, payload);

      expect(result.id).toBe("old-msg");
      expect(socketService.Message.create).not.toHaveBeenCalled();
    });
  });

  describe("Presence & Status", () => {
    it("should route global status update only to interested local watchers", () => {
      const partnerId = "partnerA";
      const watcher1 = "watcher1";
      const watcher2 = "watcher2";

      // Setup watchers
      (socketService as any).statusWatchers.set(partnerId, new Set([watcher1, watcher2]));
      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      (socketService as any)._handleGlobalStatusUpdate(partnerId, true);

      expect(socketService.io?.to).toHaveBeenCalledWith("user:watcher1");
      expect(socketService.io?.to).toHaveBeenCalledWith("user:watcher2");
      expect(socketService.io?.emit).toHaveBeenCalledTimes(2);
      expect(socketService.io?.emit).toHaveBeenCalledWith("user_status", expect.objectContaining({
        userId: partnerId,
        isOnline: true
      }));
    });
  });
});
