import Chat from "@models/chat.model";
import Message from "@models/message.model";
import { redisService } from "@services/redis.service";
import { socketService } from "@services/socket.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@services/redis.service", () => ({
  redisService: {
    incrementAndCheckLimit: vi.fn().mockResolvedValue({ allowed: true, current: 1, ttl: 60000 }),
    checkAndSetIdempotency: vi.fn().mockResolvedValue(true),
    isChatLocked: vi.fn().mockResolvedValue(false),
    getCachedPartners: vi.fn(),
    setCachedPartners: vi.fn(),
    isConnected: true,
    client: { publish: vi.fn() },
    subClient: { subscribe: vi.fn(), on: vi.fn() },
    publishCacheInvalidation: vi.fn().mockResolvedValue(null),
  },
}));

const MOCK_USER_ID = "user123";

describe("Scalability Optimizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (socketService as any).partnerCache.clear();
    (socketService as any).partnerRequests.clear();
    // Reset TypingHandler local guard
    (socketService as any).typingHandler.localGuard.clear();

    vi.mocked(Message.create).mockImplementation((data: any) =>
      Promise.resolve({
        ...data,
        _id: "new-msg-id",
        createdAt: new Date(),
        toObject: () => ({ ...data, _id: "new-msg-id", createdAt: new Date(), reactions: [] }),
      } as any),
    );
    vi.mocked(Message.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any);
    vi.mocked(Chat.findOneAndUpdate).mockResolvedValue({
      participants: [MOCK_USER_ID, "r1"],
      userA: MOCK_USER_ID,
      userB: "r1",
    } as any);
  });

  describe("Thundering Herd Protection (_getPartnerIds)", () => {
    it("should only trigger one database query for concurrent partner requests", async () => {
      const mockChats = [
        { participants: [MOCK_USER_ID, "partner1"], userA: MOCK_USER_ID, userB: "partner1" },
        { participants: ["partner2", MOCK_USER_ID], userA: "partner2", userB: MOCK_USER_ID },
      ];

      // Delay the DB response to simulate concurrency
      let queryCount = 0;
      vi.mocked(Chat.find).mockImplementation(() => {
        queryCount++;
        return {
          select: vi.fn().mockReturnThis(),
          lean: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(mockChats), 50))),
        } as any;
      });

      vi.mocked(redisService.getCachedPartners).mockResolvedValue(null);

      // Trigger 5 concurrent requests
      const results = await Promise.all([
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
        (socketService as any)._getPartnerIds(MOCK_USER_ID),
      ]);

      expect(queryCount).toBe(1);
      results.forEach((res) => {
        expect(res).toBeInstanceOf(Set);
        expect(res.has("partner1")).toBe(true);
        expect(res.has("partner2")).toBe(true);
      });

      // Map should be empty after resolution
      expect((socketService as any).partnerRequests.size).toBe(0);
    });
  });

  describe("Redis Idempotency L1 Guard", () => {
    it("should skip DB findOne if Redis says the message is new", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r1", contentBody: "Hi", idempotencyKey: "unique-key" };

      vi.mocked(redisService.checkAndSetIdempotency).mockResolvedValue(true);
      vi.mocked(Chat.findOneAndUpdate).mockResolvedValue({
        participants: [MOCK_USER_ID, "r1"],
        userA: MOCK_USER_ID,
        userB: "r1",
      } as any);

      await socketService.saveAndDeliverMessage(sender, payload);

      // Should NOT have called Message.findOne for idempotency
      expect(Message.findOne).not.toHaveBeenCalledWith({ idempotencyKey: "unique-key" });
      expect(Message.create).toHaveBeenCalled();
    });

    it("should hit DB findOne if Redis says the message is a duplicate", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r1", contentBody: "Hi", idempotencyKey: "dup-key" };

      vi.mocked(redisService.checkAndSetIdempotency).mockResolvedValue(false);
      vi.mocked(Message.findOne).mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue({ _id: "existing-id", chatId: "c1", senderId: MOCK_USER_ID, contentBody: "Hi" }),
      } as any);

      const result = await socketService.saveAndDeliverMessage(sender, payload);

      expect(Message.findOne).toHaveBeenCalledWith({ idempotencyKey: "dup-key" });
      expect(Message.create).not.toHaveBeenCalled();
      expect(redisService.incrementAndCheckLimit).not.toHaveBeenCalled();
      expect(result.id).toBe("existing-id");
    });

    it("should NOT consume rate limit token for legitimate retries (duplicates)", async () => {
      const sender = { id: MOCK_USER_ID, plan: "pro" } as any;
      const payload = { chatId: "c1", receiverId: "r2", contentBody: "Retry", idempotencyKey: "retry-key" };

      // Simulate Redis L1 hit for idempotency (already set)
      vi.mocked(redisService.checkAndSetIdempotency).mockResolvedValue(false);
      // Simulate DB hit
      vi.mocked(Message.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "msg-1", chatId: "c1", senderId: MOCK_USER_ID, contentBody: "Retry" }),
      } as any);

      await socketService.saveAndDeliverMessage(sender, payload);

      // Verify rate limit was NEVER checked for this duplicate
      expect(redisService.incrementAndCheckLimit).not.toHaveBeenCalled();
    });
  });

  describe("Typing Local Guard", () => {
    it("should throttle Redis hits for high-frequency typing events", async () => {
      const sender = { id: MOCK_USER_ID } as any;
      const payload = { chatId: "c1", receiverId: "r1" };

      // Mock cache to avoid DB hits
      (socketService as any).participantCache.set("c1", new Set([MOCK_USER_ID, "r1"]));
      socketService.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      // 1. First call hits Redis
      await socketService.handleTyping(sender, payload, true);
      expect(redisService.incrementAndCheckLimit).toHaveBeenCalledTimes(1);

      // 2. Immediate second call should NOT hit Redis (guarded locally)
      await socketService.handleTyping(sender, payload, true);
      expect(redisService.incrementAndCheckLimit).toHaveBeenCalledTimes(1); // Still 1

      // 3. Advance time and it should hit Redis again
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 3000);

      await socketService.handleTyping(sender, payload, true);
      expect(redisService.incrementAndCheckLimit).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
