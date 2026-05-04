import type { MessageDto, MessageReactionUpdateDto } from "shared/types/chat.dto";

import { chatService } from "$services/chat.service";
import { RealtimeEvent, realtimeEvents } from "$services/realtime-events";

const LOADER_AWAIT_MS = 300;

class MessageStore {
  activeChatId: string | null = $state(null);
  messages: Array<MessageDto> = $state([]);
  hasMoreMessages = $state(true);
  isLoadingMessages = $state(false);

  private messagesAbortController: AbortController | null = null;

  constructor() {
    realtimeEvents.on(RealtimeEvent.MESSAGE_RECEIVED, (msg) => this.handleReceiveMessage(msg));
    realtimeEvents.on(RealtimeEvent.MESSAGE_SENT_ACK, (data) => this.handleMessageSentAck(data.chatId, data.message));
    realtimeEvents.on(RealtimeEvent.MESSAGE_DELETED, (data) => this.handleMessageDeleted(data));
    realtimeEvents.on(RealtimeEvent.MESSAGE_UPDATED, (data) => this.handleMessageUpdated(data));
    realtimeEvents.on(RealtimeEvent.REACTION_UPDATED, (data) => this.handleReactionUpdate(data));
  }

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
      // We can use a global error store or handle it in the Facade
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

  handleReceiveMessage(message: MessageDto) {
    if (message.chatId === this.activeChatId) {
      this.messages.push(message);
    }
  }

  handleReactionUpdate(data: MessageReactionUpdateDto) {
    if (data.chatId === this.activeChatId) {
      const msg = this.messages.find((m) => m.id === data.messageId);
      if (msg) {
        if (data.reaction) {
          // Surgical Update: Mutate the local reactions array for a smoother state transition
          const { action, emoji, slug, userId } = data.reaction;
          if (!msg.reactions) msg.reactions = [];

          const group = msg.reactions.find((r) => r.emoji === emoji);

          if (action === "added") {
            if (!group) {
              msg.reactions.push({ emoji, slug, users: [userId] });
            } else if (!group.users.includes(userId)) {
              group.users.push(userId);
            }
          } else if (action === "removed" && group) {
            group.users = group.users.filter((id) => id !== userId);
            if (group.users.length === 0) {
              msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
            }
          }
        } else if (data.reactions) {
          // Fallback: If no granular data is provided, replace the entire state
          msg.reactions = data.reactions;
        }
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

  handleMessageSentAck(chatId: string, message: MessageDto) {
    if (chatId === this.activeChatId) {
      const idx = this.messages.findIndex((m) => m.idempotencyKey === message.idempotencyKey);
      if (idx === -1) {
        this.messages.push(message);
      }
    }
  }
}

export const messageStore = new MessageStore();
