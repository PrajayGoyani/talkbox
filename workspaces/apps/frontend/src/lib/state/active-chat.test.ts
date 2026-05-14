import { chatService } from "$services/chat.service";
import { realtimeEvents, RealtimeEvent } from "$services/realtime-events";
import { socketManager } from "$services/socket.manager.svelte";
import { MessageStore } from "$state/active-chat.svelte";
import { authStore } from "$state/auth.svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("$services/chat.service", () => ({
  chatService: {
    loadMessages: vi.fn(),
    loadOlderMessages: vi.fn(),
  },
}));

vi.mock("$state/auth.svelte", () => ({
  authStore: {
    user: { id: "user-1", username: "testuser" },
    subscribe: vi.fn(),
  },
}));

vi.mock("$services/socket.manager.svelte", () => ({
  socketManager: {
    setActiveChat: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

describe("MessageStore", () => {
  let store: MessageStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new MessageStore();
  });

  it("should initialize with empty state", () => {
    expect(store.messages).toEqual([]);
    expect(store.isLoadingMessages).toBe(false);
    expect(store.activeChatId).toBeNull();
  });

  it("should initialize with chatId", async () => {
    const mockMessages = [
      { id: "msg-1", contentBody: "Hello", senderId: "user-2", createdAt: new Date().toISOString() },
    ];
    (chatService.loadMessages as any).mockResolvedValue(mockMessages);

    await store.initialize("chat-1");

    expect(store.activeChatId).toBe("chat-1");
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].id).toBe("msg-1");
    expect(chatService.loadMessages).toHaveBeenCalledWith("chat-1", expect.any(AbortSignal), true);
  });

  it("should insert optimistic message", () => {
    store.initialize("chat-1");
    const idempotencyKey = "550e8400-e29b-41d4-a716-446655440000";
    vi.mocked(socketManager.sendMessage).mockReturnValue(idempotencyKey);

    store.sendMessage("Hello optimistic world", "other-user");

    expect(store.messages).toHaveLength(1);
    expect(store.messages[0]).toMatchObject({
      contentBody: "Hello optimistic world",
      status: "sending",
      idempotencyKey,
    });
  });

  it("should reconcile message on ACK", () => {
    store.initialize("chat-1");
    const idempotencyKey = "550e8400-e29b-41d4-a716-446655440001";
    vi.mocked(socketManager.sendMessage).mockReturnValue(idempotencyKey);

    store.sendMessage("Hello", "other-user");

    const serverMsg = {
      id: "real-id",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "Hello",
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    realtimeEvents.emit(RealtimeEvent.MESSAGE_SENT_ACK, { chatId: "chat-1", message: serverMsg });

    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].id).toBe("real-id");
    expect(store.messages[0].status).toBe("sent");
  });

  it("should handle timeout and mark as failed", () => {
    vi.useFakeTimers();
    store.initialize("chat-1");
    const idempotencyKey = "550e8400-e29b-41d4-a716-446655440002";
    vi.mocked(socketManager.sendMessage).mockReturnValue(idempotencyKey);

    store.sendMessage("Failing message", "other-user");
    expect(store.messages[0].status).toBe("sending");

    // Advance time by MESSAGE_ACK_TIMEOUT (15s) + margin
    vi.advanceTimersByTime(15000 + 100);

    expect(store.messages[0].status).toBe("failed");
    vi.useRealTimers();
  });

  it("should handle incoming messages", () => {
    store.initialize("chat-1");
    const incomingMsg = {
      id: "inc-1",
      chatId: "chat-1",
      senderId: "other-user",
      contentBody: "Incoming",
      createdAt: new Date().toISOString(),
    };

    realtimeEvents.emit(RealtimeEvent.MESSAGE_RECEIVED, incomingMsg);

    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].contentBody).toBe("Incoming");
  });
});
