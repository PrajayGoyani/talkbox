import type { Message } from "$types/chat";

import { chatService } from "$services/chat.service";
import { chatStore } from "$state/chat.svelte";
import { ApiError } from "$utils/errors";

const LOADER_AWAIT_MS = 300;

class ActiveChatStore {
  // State
  activeChatId: string | null = $state(null);
  messages: Array<Message> = $state([]);
  hasMoreMessages = $state(true);
  isLoadingMessages = $state(false);
  isSendingMessage = $state(false);

  private messagesAbortController: AbortController | null = null;

  async initialize(chatId: string) {
    if (this.activeChatId === chatId) return;

    this.messagesAbortController?.abort();
    this.messagesAbortController = new AbortController();

    this.activeChatId = chatId;
    this.messages = [];
    this.hasMoreMessages = true;
    this.isLoadingMessages = true;

    const startTime = Date.now();
    try {
      const loadedMessages = await chatService.loadMessages(chatId, this.messagesAbortController.signal);

      // Guard against race conditions
      if (this.activeChatId !== chatId) return;

      const elapsed = Date.now() - startTime;
      if (elapsed < LOADER_AWAIT_MS) {
        await new Promise((r) => setTimeout(r, LOADER_AWAIT_MS - elapsed));
      }

      this.messages = loadedMessages;
      this.hasMoreMessages = loadedMessages.length >= 50;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load messages:", e);
      chatStore.lastError = "Failed to load messages. Please try again.";
    } finally {
      this.isLoadingMessages = false;
    }
  }

  async loadOlderMessages() {
    if (!this.activeChatId || !this.hasMoreMessages || this.isLoadingMessages || this.messages.length === 0) return;

    this.isLoadingMessages = true;
    const oldestMessageId = this.messages[0].id;
    const startTime = Date.now();
    try {
      const olderMessages = await chatService.loadOlderMessages(
        this.activeChatId,
        oldestMessageId,
        this.messagesAbortController?.signal,
      );

      const elapsed = Date.now() - startTime;
      if (elapsed < LOADER_AWAIT_MS) {
        await new Promise((r) => setTimeout(r, LOADER_AWAIT_MS - elapsed));
      }

      if (olderMessages.length > 0) {
        this.messages.unshift(...olderMessages);
      }
      this.hasMoreMessages = olderMessages.length >= 50;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load older messages:", e);
      chatStore.lastError = "Failed to load older messages.";
    } finally {
      this.isLoadingMessages = false;
    }
  }

  clear() {
    this.messagesAbortController?.abort();
    this.messagesAbortController = null;
    this.activeChatId = null;
    this.messages = [];
    this.hasMoreMessages = true;
    this.isLoadingMessages = false;
  }

  // --- Handlers for Real-time Events ---

  handleReceiveMessage(message: Message) {
    if (message.chatId === this.activeChatId) {
      this.messages.push(message);
    }
  }

  handleReactionUpdate(data: {
    messageId: string;
    chatId: string;
    reactions: Array<{ emoji: string; slug?: string; users: string[] }>;
  }) {
    if (data.chatId === this.activeChatId) {
      const msg = this.messages.find((m) => m.id === data.messageId);
      if (msg) {
        msg.reactions = data.reactions;
      }
    }
  }

  handleMessageDeleted(data: { messageId: string; chatId: string }) {
    if (data.chatId === this.activeChatId) {
      const msg = this.messages.find((m) => m.id === data.messageId);
      if (msg) {
        msg.contentBody = "This message was deleted";
        msg.isDeleted = true;
        msg.reactions = [];
      }
    }
  }

  handleMessageUpdated(data: {
    messageId: string;
    chatId: string;
    contentBody: string;
    isEdited: boolean;
    editedAt: string;
  }) {
    if (data.chatId === this.activeChatId) {
      const msg = this.messages.find((m) => m.id === data.messageId);
      if (msg) {
        msg.contentBody = data.contentBody;
        msg.isEdited = data.isEdited;
        msg.editedAt = data.editedAt;
      }
    }
  }

  handleMessageSentAck(chatId: string, message: Message) {
    if (chatId === this.activeChatId) {
      const exists = this.messages.some((m) => m.idempotencyKey === message.idempotencyKey);
      if (!exists) {
        this.messages.push(message);
      }
    }
  }
}

export const activeChatStore = new ActiveChatStore();
