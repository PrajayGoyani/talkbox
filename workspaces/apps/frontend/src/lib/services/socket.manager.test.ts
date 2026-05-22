import { SocketManager } from "$services/socket.manager.svelte";
import { outboxStore } from "$state/chat/outbox.svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("$state/chat/outbox.svelte", () => ({
  outboxStore: {
    add: vi.fn(),
    drainQueue: vi.fn(),
  },
}));

vi.mock("$state/auth.svelte", () => ({
  authStore: {
    user: { id: "user-1", username: "testuser" },
    subscribe: vi.fn(),
  },
}));

vi.mock("$state/confirm.svelte", () => ({
  confirmStore: {},
}));

vi.mock("$state/notification.svelte", () => ({
  notificationStore: {},
}));

vi.mock("$state/router.svelte", () => ({
  routerStore: {},
}));

vi.mock("$state/ui.svelte", () => ({
  uiStore: {},
}));

describe("SocketManager Offline Integration", () => {
  let manager: SocketManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SocketManager();
  });

  it("should queue message in outbox if manager is disconnected", () => {
    manager.isConnected = false;
    manager.socket = null;
    vi.mocked(outboxStore.add).mockReturnValue("mocked-uuid");

    const key = manager.sendMessage("chat-1", "user-2", "Hello!");

    expect(outboxStore.add).toHaveBeenCalledWith("chat-1", "user-2", "Hello!");
    expect(key).toBe("mocked-uuid");
  });

  it("should queue message in outbox if socket is not initialized", () => {
    manager.isConnected = true;
    manager.socket = null;
    vi.mocked(outboxStore.add).mockReturnValue("mocked-uuid");

    const key = manager.sendMessage("chat-1", "user-2", "Hello!");

    expect(outboxStore.add).toHaveBeenCalledWith("chat-1", "user-2", "Hello!");
    expect(key).toBe("mocked-uuid");
  });

  it("should not queue message in outbox if connected", () => {
    manager.isConnected = true;
    manager.socket = {
      emit: vi.fn(),
    } as any;

    const key = manager.sendMessage("chat-1", "user-2", "Hello!");

    expect(outboxStore.add).not.toHaveBeenCalled();
    expect(manager.socket?.emit).toHaveBeenCalledWith(
      "send_message",
      expect.objectContaining({
        chatId: "chat-1",
        receiverId: "user-2",
        contentBody: "Hello!",
      }),
      expect.any(Function),
    );
  });
});
