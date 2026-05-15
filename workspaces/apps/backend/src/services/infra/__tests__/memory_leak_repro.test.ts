import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import Chat from "@models/chat.model";
import { SocketService } from "@services/chat/socket.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");

const MOCK_PRO_USER_ID = "507f1f77bcf86cd799439022";

const createMockSocket = (userId: string, plan: "free" | "pro") =>
  ({
    id: `socket-${Math.random()}`,
    data: {
      user: {
        id: userId,
        plan: plan,
      },
    },
    join: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
  }) as any;

describe("SocketService Pro Session Takeover", () => {
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
      getOldestSession: vi.fn().mockResolvedValue("some-old-id"),
      publishSessionTakeover: vi.fn(),
      takeoverFreeSession: vi.fn().mockResolvedValue([]),
    };
    const redisPresenceService: any = {
      getCachedPartners: vi.fn().mockResolvedValue(null),
      setCachedPartners: vi.fn().mockResolvedValue(null),
    };
    const redisBaseService: any = { isConnected: true, subClient: { subscribe: vi.fn(), on: vi.fn() } };
    const policyService: any = { isSessionLimitReached: vi.fn() };
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

  it("should correctly manage userId in activeConnections when a Pro session triggers takeover", async () => {
    const userId = MOCK_PRO_USER_ID;

    // Simulate Redis saying this is the (LIMIT + 1)-th session globally
    const sessionService = (socketService as any).redisSessionService;
    sessionService.incrementGlobalSession.mockResolvedValue(PRO_PLAN_SESSION_LIMIT + 1);
    sessionService.getOldestSession.mockResolvedValue("some-old-id");
    (socketService as any).policyService.isSessionLimitReached.mockReturnValue(true);

    const socket = createMockSocket(userId, "pro");

    // Handle the connection
    await socketService.handleConnection(socket);

    // Verify it was NOT rejected (Pro users trigger takeover instead)
    expect(socket.disconnect).not.toHaveBeenCalled();

    // Verify takeover was triggered (oldest session kicked, not takeoverFreeSession — Pro users use getOldestSession)
    expect(sessionService.publishSessionTakeover).toHaveBeenCalled();

    // Check that userId is in activeConnections
    const activeConnections = socketService.activeConnections;
    expect(activeConnections.has(userId)).toBe(true);
    expect(activeConnections.get(userId)!.has(socket)).toBe(true);
  });
});
