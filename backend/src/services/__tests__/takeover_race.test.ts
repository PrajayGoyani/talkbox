import { redisService } from "@services/redis.service";
import { socketService } from "@services/socket.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");
vi.mock("@services/redis.service", () => ({
  redisService: {
    takeoverFreeSession: vi.fn(),
    publishSessionTakeover: vi.fn(),
    incrementGlobalSession: vi.fn(),
    decrementGlobalSession: vi.fn(),
    getGlobalSessionCount: vi.fn(),
    subClient: {
      subscribe: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
    },
    isConnected: true,
  },
}));

const MOCK_USER_ID = "user-123";

const createMockSocket = (userId: string, id: string) =>
  ({
    id,
    data: {
      user: {
        id: userId,
        plan: "free",
      },
    },
    join: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
  }) as any;

describe("SocketService Takeover Race Condition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (socketService as any).activeConnections.clear();
  });

  it("should only disconnect the specified victim and spare others during global takeover", async () => {
    const socketA = createMockSocket(MOCK_USER_ID, "socket-A");
    const socketB = createMockSocket(MOCK_USER_ID, "socket-B");

    // Add both to active connections locally (simulating a race where both connected)
    const userSockets = new Set([socketA, socketB]);
    (socketService as any).activeConnections.set(MOCK_USER_ID, userSockets);

    // Simulate receiving a takeover message for socketA
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-A");

    // Socket A should be kicked
    expect(socketA.emit).toHaveBeenCalledWith("session_error", expect.objectContaining({ reason: "takeover" }));
    expect(socketA.disconnect).toHaveBeenCalled();

    // Socket B should be SPARED
    expect(socketB.emit).not.toHaveBeenCalled();
    expect(socketB.disconnect).not.toHaveBeenCalled();

    // Local state should only have Socket B
    expect(userSockets.size).toBe(1);
    expect(userSockets.has(socketB)).toBe(true);
  });

  it("should handle multiple victims sequentially without kicking the winner", async () => {
    const socketWinner = createMockSocket(MOCK_USER_ID, "socket-Winner");
    const socketVictim1 = createMockSocket(MOCK_USER_ID, "socket-Victim1");
    const socketVictim2 = createMockSocket(MOCK_USER_ID, "socket-Victim2");

    const userSockets = new Set([socketWinner, socketVictim1, socketVictim2]);
    (socketService as any).activeConnections.set(MOCK_USER_ID, userSockets);

    // Takeover message for Victim 1
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-Victim1");
    expect(socketVictim1.disconnect).toHaveBeenCalled();
    expect(userSockets.size).toBe(2);

    // Takeover message for Victim 2
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-Victim2");
    expect(socketVictim2.disconnect).toHaveBeenCalled();
    expect(userSockets.size).toBe(1);

    // Winner remains
    expect(socketWinner.disconnect).not.toHaveBeenCalled();
    expect(userSockets.has(socketWinner)).toBe(true);
  });

  it("should kick everyone if no victimSocketId is provided (fallback safety)", async () => {
    const socketA = createMockSocket(MOCK_USER_ID, "socket-A");
    const socketB = createMockSocket(MOCK_USER_ID, "socket-B");

    const userSockets = new Set([socketA, socketB]);
    (socketService as any).activeConnections.set(MOCK_USER_ID, userSockets);

    // Global takeover with NO specific victim (old behavior or fallback)
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, undefined);

    expect(socketA.disconnect).toHaveBeenCalled();
    expect(socketB.disconnect).toHaveBeenCalled();
    expect((socketService as any).activeConnections.has(MOCK_USER_ID)).toBe(false);
  });
});
