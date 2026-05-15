import Chat from "@models/chat.model";
import { SocketService } from "@services/chat/socket.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");

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
  let socketService: SocketService;

  beforeEach(() => {
    vi.clearAllMocks();
    const chatRepo: any = { findById: vi.fn() };
    const messageRepo: any = { create: vi.fn() };
    const userRepo: any = { findByIds: vi.fn() };
    const chatQueryRepo: any = { findPartnerChats: vi.fn().mockResolvedValue([]) };
    const partnerRepo: any = { getPartnerIds: vi.fn().mockResolvedValue(new Set()), invalidatePartnerCache: vi.fn() };
    const messageService: any = { invalidateCache: vi.fn(), markChatRead: vi.fn() };
    const presenceService: any = { notifyStatusChange: vi.fn(), getPartnersStatusBatch: vi.fn().mockResolvedValue([]) };
    const messageHandler: any = { saveAndDeliver: vi.fn(), handleDelete: vi.fn(), handleEdit: vi.fn() };
    const reactionHandler: any = { handleReaction: vi.fn() };
    const typingHandler: any = { handleTyping: vi.fn() };
    const redisSessionService: any = {
      incrementGlobalSession: vi.fn(),
      decrementGlobalSession: vi.fn(),
      getGlobalSessionCount: vi.fn(),
      getOldestSession: vi.fn().mockResolvedValue(null),
      publishSessionTakeover: vi.fn(),
      takeoverFreeSession: vi.fn(),
    };
    const redisPresenceService: any = {
      getCachedPartners: vi.fn().mockResolvedValue(null),
      setCachedPartners: vi.fn().mockResolvedValue(null),
    };
    const redisBaseService: any = { isConnected: true, subClient: { subscribe: vi.fn(), on: vi.fn() } };
    const policyService: any = { isSessionLimitReached: vi.fn().mockReturnValue(false) };
    const chatCacheService: any = {
      getPartners: vi.fn(),
      setPartners: vi.fn(),
      invalidateParticipants: vi.fn(),
      invalidatePartners: vi.fn(),
    };

    socketService = new SocketService(
      chatRepo,
      messageRepo,
      userRepo,
      chatQueryRepo,
      messageService,
      presenceService,
      messageHandler,
      reactionHandler,
      typingHandler,
      redisSessionService,
      redisPresenceService,
      redisBaseService,
      policyService,
      chatCacheService,
    );
    socketService.activeConnections.clear();
    vi.spyOn(Chat, "find").mockReturnValue({
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

    // Register them properly — each call uses mock redisSessionService
    await socketService.handleConnection(socketA);
    await socketService.handleConnection(socketB);

    // Simulate receiving a takeover message for socketA
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-A");

    // Socket A should be kicked
    expect(socketA.emit).toHaveBeenCalledWith("session_error", {
      reason: "takeover",
      message: expect.any(String),
    });
    expect(socketA.disconnect).toHaveBeenCalled();

    // Manually trigger disconnect
    if (disconnectA) await disconnectA();

    // Socket B should be SPARED
    expect(socketB.emit).not.toHaveBeenCalled();
    expect(socketB.disconnect).not.toHaveBeenCalled();

    // Local state should only have Socket B
    const userSockets = socketService.activeConnections.get(MOCK_USER_ID);
    expect(userSockets!.size).toBe(1);
    expect(userSockets!.has(socketB)).toBe(true);
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

    await socketService.handleConnection(socketWinner);
    await socketService.handleConnection(socketVictim1);
    await socketService.handleConnection(socketVictim2);

    // Takeover message for Victim 1
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-Victim1");
    if (disconnect1) await disconnect1();
    const userSockets = socketService.activeConnections.get(MOCK_USER_ID);
    expect(userSockets!.size).toBe(2);

    // Takeover message for Victim 2
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, "socket-Victim2");
    if (disconnect2) await disconnect2();
    expect(userSockets!.size).toBe(1);

    // Winner remains
    expect(socketWinner.disconnect).not.toHaveBeenCalled();
    expect(userSockets!.has(socketWinner)).toBe(true);
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

    await socketService.handleConnection(socketA);
    await socketService.handleConnection(socketB);

    // Global takeover with NO specific victim
    (socketService as any)._handleGlobalTakeover(MOCK_USER_ID, undefined);

    if (d1) await d1();
    if (d2) await d2();

    expect(socketA.disconnect).toHaveBeenCalled();
    expect(socketB.disconnect).toHaveBeenCalled();
    expect(socketService.activeConnections.has(MOCK_USER_ID)).toBe(false);
  });
});
