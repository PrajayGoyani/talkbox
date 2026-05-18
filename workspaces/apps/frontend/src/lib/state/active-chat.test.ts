import type { FrontendMessageDto } from "$lib/types/chat";

import { chatService } from "$services/chat.service";
import { realtimeEvents, RealtimeEvent } from "$services/realtime-events";
import { socketManager } from "$services/socket.manager.svelte";
import { MessageStore } from "$state/active-chat.svelte";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  afterEach(() => {
    store.destroy();
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

  it("should deduplicate incoming message when already present", () => {
    store.initialize("chat-1");
    const msg: FrontendMessageDto = {
      id: "dup-1",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "Hello",
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    store.messages.push({ ...msg });
    expect(store.messages).toHaveLength(1);

    realtimeEvents.emit(RealtimeEvent.MESSAGE_RECEIVED, msg);

    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].status).toBe("sent");
  });

  it("should handle message deleted event", () => {
    store.initialize("chat-1");
    store.messages.push({
      id: "del-1",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "Will be deleted",
      createdAt: new Date().toISOString(),
    } as FrontendMessageDto);

    realtimeEvents.emit(RealtimeEvent.MESSAGE_DELETED, { messageId: "del-1", chatId: "chat-1" });

    expect(store.messages[0].contentBody).toBe("This message was deleted");
    expect(store.messages[0].isDeleted).toBe(true);
  });

  it("should ignore deleted event for wrong chat", () => {
    store.initialize("chat-1");
    store.messages.push({
      id: "del-2",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "Keep me",
      createdAt: new Date().toISOString(),
    } as FrontendMessageDto);

    realtimeEvents.emit(RealtimeEvent.MESSAGE_DELETED, { messageId: "del-2", chatId: "chat-2" });

    expect(store.messages[0].contentBody).toBe("Keep me");
  });

  it("should handle message updated event", () => {
    store.initialize("chat-1");
    store.messages.push({
      id: "edit-1",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "Original",
      createdAt: new Date().toISOString(),
    } as FrontendMessageDto);

    realtimeEvents.emit(RealtimeEvent.MESSAGE_UPDATED, {
      messageId: "edit-1",
      chatId: "chat-1",
      contentBody: "Edited content",
      isEdited: true,
      editedAt: new Date().toISOString(),
    });

    expect(store.messages[0].contentBody).toBe("Edited content");
    expect(store.messages[0].isEdited).toBe(true);
  });

  it("should handle reaction added event", () => {
    store.initialize("chat-1");
    store.messages.push({
      id: "react-1",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "Nice!",
      reactions: [],
      createdAt: new Date().toISOString(),
    } as FrontendMessageDto);

    realtimeEvents.emit(RealtimeEvent.REACTION_UPDATED, {
      chatId: "chat-1",
      messageId: "react-1",
      reaction: { action: "added", emoji: "👍", slug: "thumbs-up", userId: "user-2" },
    });

    expect(store.messages[0].reactions).toHaveLength(1);
    expect(store.messages[0].reactions![0].emoji).toBe("👍");
    expect(store.messages[0].reactions![0].users).toContain("user-2");
  });

  it("should handle reaction removed event", () => {
    store.initialize("chat-1");
    store.messages.push({
      id: "react-2",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "Great!",
      reactions: [{ emoji: "🎉", slug: "party", users: ["user-2", "user-3"] }],
      createdAt: new Date().toISOString(),
    } as FrontendMessageDto);

    realtimeEvents.emit(RealtimeEvent.REACTION_UPDATED, {
      chatId: "chat-1",
      messageId: "react-2",
      reaction: { action: "removed", emoji: "🎉", slug: "party", userId: "user-2" },
    });

    expect(store.messages[0].reactions![0].users).toEqual(["user-3"]);
  });

  it("should retry failed message", () => {
    vi.useFakeTimers();
    store.initialize("chat-1");
    const idempotencyKey = "550e8400-e29b-41d4-a716-446655440010";
    vi.mocked(socketManager.sendMessage).mockReturnValue(idempotencyKey);

    store.sendMessage("Retry me", "other-user");
    vi.advanceTimersByTime(15100);
    expect(store.messages[0].status).toBe("failed");

    store.retryMessage(store.messages[0].id);

    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].status).toBe("sending");
    expect(socketManager.sendMessage).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("should clear all state", () => {
    store.initialize("chat-1");
    store.messages.push({
      id: "m1",
      chatId: "chat-1",
      senderId: "user-1",
      contentBody: "test",
      createdAt: new Date().toISOString(),
    } as FrontendMessageDto);
    store.clear();

    expect(store.activeChatId).toBeNull();
    expect(store.messages).toEqual([]);
    expect(store.hasMoreMessages).toBe(true);
    expect(store.isLoadingMessages).toBe(false);
    expect(socketManager.setActiveChat).toHaveBeenCalledWith(null);
  });

  it("should load older messages", async () => {
    await store.initialize("chat-1");
    store.hasMoreMessages = true;
    vi.mocked(chatService.loadOlderMessages).mockResolvedValue([
      {
        id: "older-msg",
        chatId: "chat-1",
        senderId: "user-2",
        contentBody: "Older",
        createdAt: new Date().toISOString(),
      },
    ] as FrontendMessageDto[]);

    await store.loadOlderMessages();

    expect(chatService.loadOlderMessages).toHaveBeenCalledWith("chat-1", "msg-1", expect.any(AbortSignal));
    expect(store.messages).toHaveLength(2);
    expect(store.messages[0].id).toBe("older-msg");
    expect(store.messages[1].id).toBe("msg-1");
  });
});
