import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { socketService } from "../socket.service";

// Mock dependencies
vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");

import Chat from "@models/chat.model";
import User from "@models/user.model";

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

    vi.mocked(Chat.find).mockReturnValue(createQueryMock() as any);
    vi.mocked(User.find).mockReturnValue(createQueryMock() as any);
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue({} as any);
  });

  describe("handleConnection", () => {
    it("should allow a single connection for a Free user", () => {
      const socket = createMockSocket(MOCK_USER_ID, "free");
      socketService.handleConnection(socket);

      const userSockets = (socketService as any).activeConnections.get(MOCK_USER_ID);
      expect(userSockets.size).toBe(1);
      expect(userSockets.has(socket)).toBe(true);
      expect(socket.emit).not.toHaveBeenCalledWith("session_error", expect.anything());
    });

    it("should perform takeover when a Free user connects from a second device", () => {
      const socket1 = createMockSocket(MOCK_USER_ID, "free");
      const socket2 = createMockSocket(MOCK_USER_ID, "free");

      // First connection
      socketService.handleConnection(socket1);
      expect((socketService as any).activeConnections.get(MOCK_USER_ID).size).toBe(1);

      // Second connection (Takeover)
      socketService.handleConnection(socket2);

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
      expect(userSockets.has(socket1)).toBe(false);
    });

    it("should allow multiple connections for a Pro user up to the limit", () => {
      const userId = MOCK_PRO_USER_ID;
      const sockets: any[] = [];

      // Connect up to limit
      for (let i = 0; i < PRO_PLAN_SESSION_LIMIT; i++) {
        const s = createMockSocket(userId, "pro");
        sockets.push(s);
        socketService.handleConnection(s);
      }

      const userSockets = (socketService as any).activeConnections.get(userId);
      expect(userSockets.size).toBe(PRO_PLAN_SESSION_LIMIT);

      sockets.forEach((s) => {
        expect(s.disconnect).not.toHaveBeenCalled();
      });
    });

    it("should reject connection for a Pro user exceeding the limit", () => {
      const userId = MOCK_PRO_USER_ID;

      // Connect to limit
      for (let i = 0; i < PRO_PLAN_SESSION_LIMIT; i++) {
        socketService.handleConnection(createMockSocket(userId, "pro"));
      }

      // Try one more
      const extraSocket = createMockSocket(userId, "pro");
      socketService.handleConnection(extraSocket);

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
    it("should clean up connection set on disconnect", () => {
      const socket = createMockSocket(MOCK_USER_ID, "free");
      let disconnectHandler: Function = () => {};
      socket.on.mockImplementation((event: string, handler: Function) => {
        if (event === "disconnect") disconnectHandler = handler;
      });

      socketService.handleConnection(socket);
      expect((socketService as any).activeConnections.get(MOCK_USER_ID).size).toBe(1);

      // Simulate disconnect
      disconnectHandler();

      expect((socketService as any).activeConnections.get(MOCK_USER_ID)).toBeUndefined();
    });
  });
});
