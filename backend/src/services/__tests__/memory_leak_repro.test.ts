import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
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
  },
}));

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

describe("SocketService Memory Leak Reproduction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (socketService as any).activeConnections.clear();
    vi.mocked(Chat.find).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
  });

  it("should correctly manage userId in activeConnections when a Pro session triggers takeover", async () => {
    const userId = MOCK_PRO_USER_ID;

    // Simulate Redis saying this is the (LIMIT + 1)-th session globally
    vi.mocked(redisService.incrementGlobalSession).mockResolvedValue(PRO_PLAN_SESSION_LIMIT + 1);
    vi.mocked(redisService.getOldestSession).mockResolvedValue("some-old-id");

    const socket = createMockSocket(userId, "pro");

    // Handle the connection
    await socketService.handleConnection(socket);

    // Verify it was NOT rejected (Pro users trigger takeover instead)
    expect(socket.disconnect).not.toHaveBeenCalled();

    // Check that userId is in activeConnections
    const activeConnections = (socketService as any).activeConnections;
    expect(activeConnections.has(userId)).toBe(true);
    expect(activeConnections.get(userId).has(socket)).toBe(true);
  });
});
