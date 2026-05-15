import Chat from "@models/chat.model";
import { SocketService } from "@services/chat/socket.service";
import { bench, describe, vi } from "vitest";

vi.mock("@models/chat.model");
vi.mock("@services/infra/redis.service", () => ({
  redisPresenceService: {
    getCachedPartners: vi.fn().mockResolvedValue(null),
    setCachedPartners: vi.fn().mockResolvedValue(true),
  },
  baseService: {
    subClient: null,
    isConnected: false,
  },
}));

const MOCK_USER_ID = "user123";

function createSocketService(): SocketService {
  const mockFn = vi.fn();
  const chatCacheService = {
    getPartners: vi.fn(),
    setPartners: vi.fn(),
    invalidatePartners: vi.fn(),
    getParticipants: vi.fn(),
    setParticipants: vi.fn(),
    invalidateParticipants: vi.fn(),
  };

  const chatQueryRepo = { findPartnerChats: vi.fn().mockResolvedValue([]) };

  return new SocketService(
    {} as any,
    {} as any,
    {} as any,
    chatQueryRepo as any,
    { getChatMessages: mockFn, markChatRead: mockFn, invalidateCache: mockFn } as any,
    { notifyStatusChange: mockFn, getPartnersStatusBatch: mockFn } as any,
    { saveAndDeliver: mockFn, handleDelete: mockFn, handleEdit: mockFn } as any,
    { handleReaction: mockFn } as any,
    { handleTyping: mockFn, localGuard: new Map() } as any,
    {} as any,
    { getCachedPartners: mockFn, setCachedPartners: mockFn } as any,
    { subClient: null } as any,
    { isSessionLimitReached: () => false } as any,
    chatCacheService as any,
  );
}

describe("Scalability Benchmarks", () => {
  describe("Thundering Herd Protection (_getPartnerIds)", () => {
    bench("100 concurrent partner requests with protection", async () => {
      vi.spyOn(Chat, "find").mockImplementation(() => {
        return {
          select: vi.fn().mockReturnThis(),
          lean: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 5))),
        } as any;
      });

      const svc = createSocketService();

      await Promise.all(Array.from({ length: 100 }).map(() => (svc as any)._getPartnerIds(MOCK_USER_ID)));
    });

    bench("100 serial partner requests with L1 cache hits", async () => {
      vi.spyOn(Chat, "find").mockResolvedValue([] as any);
      const svc = createSocketService();

      for (let i = 0; i < 100; i++) {
        await (svc as any)._getPartnerIds(MOCK_USER_ID);
      }
    });
  });

  describe("Typing Local Guard", () => {
    const sender = { id: MOCK_USER_ID } as any;
    const payload = { chatId: "c1", receiverId: "r1" };

    bench("handleTyping - 1000 noisy events (throttled)", async () => {
      const typingHandler = { handleTyping: vi.fn(), localGuard: new Map() };
      const svc = new SocketService(
        {} as any,
        {} as any,
        {} as any,
        { findPartnerChats: vi.fn().mockResolvedValue([]) } as any,
        { getChatMessages: vi.fn(), markChatRead: vi.fn(), invalidateCache: vi.fn() } as any,
        { notifyStatusChange: vi.fn(), getPartnersStatusBatch: vi.fn() } as any,
        { saveAndDeliver: vi.fn(), handleDelete: vi.fn(), handleEdit: vi.fn() } as any,
        { handleReaction: vi.fn() } as any,
        typingHandler as any,
        {} as any,
        {} as any,
        { subClient: null } as any,
        { isSessionLimitReached: () => false } as any,
        {} as any,
      );
      svc.io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

      for (let i = 0; i < 1000; i++) {
        await svc.handleTyping(sender, payload, true);
      }
    });
  });
});
