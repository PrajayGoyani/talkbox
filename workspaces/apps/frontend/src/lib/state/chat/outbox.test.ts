import { socketManager } from "$services/socket.manager.svelte";
import { outboxStore } from "$state/chat/outbox.svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock window and localStorage for Node test environment
if (typeof global.window === "undefined") {
  global.window = global as any;
}

if (typeof global.localStorage === "undefined") {
  const store = new Map<string, string>();
  global.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    clear: () => store.clear(),
    removeItem: (key: string) => store.delete(key),
    length: 0,
    key: (index: number) => null,
  };
}

// Mock socketManager
vi.mock("$services/socket.manager.svelte", () => ({
  socketManager: {
    isConnected: false,
    socket: {
      emit: vi.fn(),
    },
  },
}));

describe("OutboxStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    outboxStore.queue = [];
    localStorage.clear();
  });

  it("should initialize with empty queue", () => {
    expect(outboxStore.queue).toEqual([]);
  });

  it("should add item to queue and persist to localStorage", () => {
    const key = outboxStore.add("chat-1", "user-2", "Hello offline world");

    expect(outboxStore.queue).toHaveLength(1);
    expect(outboxStore.queue[0]).toMatchObject({
      idempotencyKey: key,
      chatId: "chat-1",
      receiverId: "user-2",
      contentBody: "Hello offline world",
    });

    const stored = localStorage.getItem("talkbox_outbox_queue");
    expect(stored).toBeDefined();
    expect(JSON.parse(stored!)).toHaveLength(1);
    expect(JSON.parse(stored!)[0].idempotencyKey).toBe(key);
  });

  it("should remove item from queue and persist to localStorage", () => {
    const key = outboxStore.add("chat-1", "user-2", "Hello");
    expect(outboxStore.queue).toHaveLength(1);

    outboxStore.remove(key);

    expect(outboxStore.queue).toHaveLength(0);
    const stored = localStorage.getItem("talkbox_outbox_queue");
    expect(JSON.parse(stored!)).toHaveLength(0);
  });

  it("should not drain queue if disconnected", () => {
    outboxStore.add("chat-1", "user-2", "Hello");
    socketManager.isConnected = false;

    outboxStore.drainQueue();

    expect(socketManager.socket?.emit).not.toHaveBeenCalled();
    expect(outboxStore.queue).toHaveLength(1);
  });

  it("should drain queue and remove item on successful ACK when connected", () => {
    const key = outboxStore.add("chat-1", "user-2", "Hello");
    socketManager.isConnected = true;

    vi.mocked(socketManager.socket?.emit).mockImplementation((event: string, payload: any, callback?: any) => {
      if (callback) {
        callback({ status: "ok" });
      }
      return null as any;
    });

    outboxStore.drainQueue();

    expect(socketManager.socket?.emit).toHaveBeenCalledWith(
      "send_message",
      expect.objectContaining({
        chatId: "chat-1",
        receiverId: "user-2",
        contentBody: "Hello",
        idempotencyKey: key,
      }),
      expect.any(Function),
    );
    expect(outboxStore.queue).toHaveLength(0);
  });
});
