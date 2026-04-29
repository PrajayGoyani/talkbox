import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
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

const MOCK_PRO_USER_ID = "pro_user_123";

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
  });

  it("should clean up userId from activeConnections when a Pro session is rejected and it was the only local session", async () => {
    const userId = MOCK_PRO_USER_ID;

    // Simulate Redis saying this is the (LIMIT + 1)-th session globally
    vi.mocked(redisService.incrementGlobalSession).mockResolvedValue(PRO_PLAN_SESSION_LIMIT + 1);

    const socket = createMockSocket(userId, "pro");

    // Handle the connection which should be rejected
    await socketService.handleConnection(socket);

    // Verify rejection
    expect(socket.disconnect).toHaveBeenCalled();

    // Check for leak
    const activeConnections = (socketService as any).activeConnections;
    expect(activeConnections.has(userId)).toBe(false);
  });
});
