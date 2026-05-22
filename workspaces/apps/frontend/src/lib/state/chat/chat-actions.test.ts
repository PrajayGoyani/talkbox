import { chatService } from "$services/chat.service";
import { messageStore } from "$state/active-chat.svelte";
import { chatActions } from "$state/chat/chat-actions.svelte";
import { chatListStore } from "$state/chat/chat-list.svelte";
import { uiStore } from "$state/ui.svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("$services/chat.service", () => ({
  chatService: {
    deleteChat: vi.fn(),
  },
}));

vi.mock("$state/chat/chat-list.svelte", () => ({
  chatListStore: {
    removeChatLocally: vi.fn(),
  },
}));

vi.mock("$state/active-chat.svelte", () => ({
  messageStore: {
    activeChatId: null,
    destroy: vi.fn(),
  },
}));

vi.mock("$state/ui.svelte", () => ({
  uiStore: {
    navigate: vi.fn(),
    addAlert: vi.fn(),
  },
}));

vi.mock("$state/ui.svelte.ts", () => ({
  uiStore: {
    navigate: vi.fn(),
    addAlert: vi.fn(),
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

describe("ChatActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageStore.activeChatId = null;
  });

  describe("deleteChat", () => {
    it("should successfully delete a chat and navigate away if active", async () => {
      const chatId = "chat-123";
      messageStore.activeChatId = chatId;
      vi.mocked(chatService.deleteChat).mockResolvedValue({ message: "Chat deleted" });

      await chatActions.deleteChat(chatId);

      expect(chatService.deleteChat).toHaveBeenCalledWith(chatId);
      expect(chatListStore.removeChatLocally).toHaveBeenCalledWith(chatId);
      expect(messageStore.destroy).toHaveBeenCalled();
      expect(uiStore.navigate).toHaveBeenCalledWith("/chat/conversations");
    });

    it("should delete a chat and NOT navigate if chat is not active", async () => {
      const chatId = "chat-123";
      messageStore.activeChatId = "different-chat";
      vi.mocked(chatService.deleteChat).mockResolvedValue({ message: "Chat deleted" });

      await chatActions.deleteChat(chatId);

      expect(chatService.deleteChat).toHaveBeenCalledWith(chatId);
      expect(chatListStore.removeChatLocally).toHaveBeenCalledWith(chatId);
      expect(messageStore.destroy).not.toHaveBeenCalled();
      expect(uiStore.navigate).not.toHaveBeenCalled();
    });

    it("should handle error during deletion", async () => {
      const chatId = "chat-123";
      const errorMsg = "Deletion failed";
      vi.mocked(chatService.deleteChat).mockRejectedValue(new Error(errorMsg));

      await expect(chatActions.deleteChat(chatId)).rejects.toThrow(errorMsg);
      expect(chatActions.lastError).toBe(errorMsg);
      expect(chatListStore.removeChatLocally).not.toHaveBeenCalled();
    });
  });
});
