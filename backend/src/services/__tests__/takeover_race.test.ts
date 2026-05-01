import Chat from "@models/chat.model";
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
    getOldestSession: vi.fn().mockResolvedValue(null),
    getCachedPartners: vi.fn().mockResolvedValue(null),
    setCachedPartners: vi.fn().mockResolvedValue(null),
    setUserOnline: vi.fn().mockResolvedValue(null),
    setUserOffline: vi.fn().mockResolvedValue(null),
    subClient: {
      subscribe: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
    },
    isConnected: true,
  },
}));

const MOCK_USER_ID = "507f1f77bcf86cd799439011";

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
    vi.mocked(Chat.find).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
  });

  it("should only disconnect the specified victim and spare others during global takeover", async () => {
    const socketA = createMockSocket(MOCK_USER_ID, "socket-A");
    const socketB = createMockSocket(MOCK_USER_ID, "socket-B");

    // Capture disconnect handlers
    let disconnectA: any;
    socketA.on.mockImplementation((ev: string, fn: any) => {
      if (ev === "disconnect") disconnectA = fn;
    });

    // Register them properly
    vi.mocked(redisService.takeoverFreeSession).mockResolvedValue([]);
    await socketService.handleConnection(socketA);
    await socketService.handleConnection(socketB);

    // Simulate receiving a takeover message for socketA
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-A");

    // Socket A should be kicked
    expect(socketA.emit).toHaveBeenCalledWith("error", expect.objectContaining({ code: "SESSION_TAKEOVER" }));
    expect(socketA.disconnect).toHaveBeenCalled();

    // Manually trigger disconnect
    if (disconnectA) await disconnectA();

    // Socket B should be SPARED
    expect(socketB.emit).not.toHaveBeenCalled();
    expect(socketB.disconnect).not.toHaveBeenCalled();

    // Local state should only have Socket B
    const userSockets = (socketService as any).activeConnections.get(MOCK_USER_ID);
    expect(userSockets.size).toBe(1);
    expect(userSockets.has(socketB)).toBe(true);
  });

  it("should handle multiple victims sequentially without kicking the winner", async () => {
    const socketWinner = createMockSocket(MOCK_USER_ID, "socket-Winner");
    const socketVictim1 = createMockSocket(MOCK_USER_ID, "socket-Victim1");
    const socketVictim2 = createMockSocket(MOCK_USER_ID, "socket-Victim2");

    let disconnect1: any, disconnect2: any;
    socketVictim1.on.mockImplementation((ev: string, fn: any) => {
      if (ev === "disconnect") disconnect1 = fn;
    });
    socketVictim2.on.mockImplementation((ev: string, fn: any) => {
      if (ev === "disconnect") disconnect2 = fn;
    });

    vi.mocked(redisService.takeoverFreeSession).mockResolvedValue([]);
    await socketService.handleConnection(socketWinner);
    await socketService.handleConnection(socketVictim1);
    await socketService.handleConnection(socketVictim2);

    // Takeover message for Victim 1
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-Victim1");
    if (disconnect1) await disconnect1();
    const userSockets = (socketService as any).activeConnections.get(MOCK_USER_ID);
    expect(userSockets.size).toBe(2);

    // Takeover message for Victim 2
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-Victim2");
    if (disconnect2) await disconnect2();
    expect(userSockets.size).toBe(1);

    // Winner remains
    expect(socketWinner.disconnect).not.toHaveBeenCalled();
    expect(userSockets.has(socketWinner)).toBe(true);
  });

  it("should kick everyone if no victimSocketId is provided (fallback safety)", async () => {
    const socketA = createMockSocket(MOCK_USER_ID, "socket-A");
    const socketB = createMockSocket(MOCK_USER_ID, "socket-B");

    let d1: any, d2: any;
    socketA.on.mockImplementation((ev: string, fn: any) => {
      if (ev === "disconnect") d1 = fn;
    });
    socketB.on.mockImplementation((ev: string, fn: any) => {
      if (ev === "disconnect") d2 = fn;
    });

    vi.mocked(redisService.takeoverFreeSession).mockResolvedValue([]);
    await socketService.handleConnection(socketA);
    await socketService.handleConnection(socketB);

    // Global takeover with NO specific victim
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, undefined);

    if (d1) await d1();
    if (d2) await d2();

    expect(socketA.disconnect).toHaveBeenCalled();
    expect(socketB.disconnect).toHaveBeenCalled();
    expect((socketService as any).activeConnections.has(MOCK_USER_ID)).toBe(false);
  });
});
