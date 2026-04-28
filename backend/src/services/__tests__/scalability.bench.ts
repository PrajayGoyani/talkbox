import Chat from "@models/chat.model";
import { socketService } from "@services/socket.service";
import { bench, describe, vi } from "vitest";

vi.mock("@models/chat.model");
vi.mock("@services/redis.service", () => ({
  redisService: {
    incrementAndCheckLimit: vi.fn().mockResolvedValue(true),
    getCachedPartners: vi.fn().mockResolvedValue(null),
    setCachedPartners: vi.fn().mockResolvedValue(true),
    isConnected: true,
  },
}));

const MOCK_USER_ID = "user123";

describe("Scalability Benchmarks", () => {
  describe("Thundering Herd Protection (_getPartnerIds)", () => {
    // We'll benchmark the time it takes to resolve 100 concurrent requests
    bench("100 concurrent partner requests with protection", async () => {
      vi.mocked(Chat.find).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnThis(),
          lean: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 5))),
        } as any;
      });

      // Clear internal state
      (socketService as any).partnerCache.clear();
      (socketService as any).partnerRequests.clear();

      await Promise.all(Array.from({ length: 100 }).map(() => (socketService as any)._getPartnerIds(MOCK_USER_ID)));
    });

    bench("100 serial partner requests with L1 cache hits", async () => {
      // Warm up cache
      vi.mocked(Chat.find).mockResolvedValue([] as any);
      (socketService as any).partnerCache.set(MOCK_USER_ID, new Set());

      for (let i = 0; i < 100; i++) {
        await (socketService as any)._getPartnerIds(MOCK_USER_ID);
      }
    });
  });

  describe("Typing Local Guard", () => {
    const sender = { id: MOCK_USER_ID } as any;
    const payload = { chatId: "c1", receiverId: "r1" };

    // Setup cache to avoid DB hits during bench
    (socketService as any).participantCache.set("c1", new Set([MOCK_USER_ID, "r1"]));
    socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

    bench("handleTyping - 1000 noisy events (throttled)", async () => {
      for (let i = 0; i < 1000; i++) {
        await socketService.handleTyping(sender, payload, true);
      }
    });
  });
});
