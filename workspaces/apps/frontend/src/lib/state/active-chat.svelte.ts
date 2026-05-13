import type { FrontendMessageDto } from "$lib/types/chat";
import type { AuthObserver } from "$state/auth-observer";
import type { MessageDto, MessageReactionUpdateDto } from "shared/types/chat.dto";

import { MESSAGE_ACK_TIMEOUT, MESSAGE_LOADER_AWAIT_MS } from "$lib/config";
import { chatService } from "$services/chat.service";
import { RealtimeEvent, realtimeEvents } from "$services/realtime-events";
import { socketManager } from "$services/socket.manager.svelte";
import { authStore } from "$state/auth.svelte";

export class MessageStore implements AuthObserver {
  activeChatId: string | null = $state(null);
  messages: Array<FrontendMessageDto> = $state([]);
  hasMoreMessages = $state(true);
  isLoadingMessages = $state(false);

  private messagesAbortController: AbortController | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    this.subscribe();
    authStore.subscribe(this);
  }

  private subscribe() {
    if (this.unsubscribers.length > 0) return;
    this.unsubscribers.push(
      realtimeEvents.on(RealtimeEvent.MESSAGE_RECEIVED, (data) => this.handleReceiveMessage(data)),
      realtimeEvents.on(RealtimeEvent.MESSAGE_SENT_ACK, (data) => this.handleMessageSentAck(data.chatId, data.message)),
      realtimeEvents.on(RealtimeEvent.MESSAGE_DELETED, (data) => this.handleMessageDeleted(data)),
      realtimeEvents.on(RealtimeEvent.MESSAGE_UPDATED, (data) => this.handleMessageUpdated(data)),
      realtimeEvents.on(RealtimeEvent.REACTION_UPDATED, (data) => this.handleReactionUpdate(data)),
    );
  }

  /**
   * Cleanup listeners when the store is no longer needed.
   */
  destroy() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  async initialize(chatId: string) {
    this.subscribe();
    if (this.activeChatId === chatId) return;

    this.messagesAbortController?.abort();
    this.messagesAbortController = new AbortController();

    this.activeChatId = chatId;
    this.messages = [];
    this.hasMoreMessages = true;
    this.isLoadingMessages = true;

    socketManager.setActiveChat(chatId);

    const startTime = Date.now();
    try {
      const loadedMessages = await chatService.loadMessages(chatId, this.messagesAbortController.signal, true);

      if (this.activeChatId !== chatId) return;

      const elapsed = Date.now() - startTime;
      if (elapsed < MESSAGE_LOADER_AWAIT_MS) {
        await new Promise((r) => setTimeout(r, MESSAGE_LOADER_AWAIT_MS - elapsed));
      }

      this.messages = loadedMessages as FrontendMessageDto[];
      this.hasMoreMessages = loadedMessages.length >= 50;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load messages:", e);
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
      if (elapsed < MESSAGE_LOADER_AWAIT_MS) {
        await new Promise((r) => setTimeout(r, MESSAGE_LOADER_AWAIT_MS - elapsed));
      }

      if (olderMessages.length > 0) {
        this.messages.unshift(...(olderMessages as FrontendMessageDto[]));
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
    this.destroy();
    this.messagesAbortController?.abort();
    this.messagesAbortController = null;
    this.activeChatId = null;
    this.messages = [];
    this.hasMoreMessages = true;
    this.isLoadingMessages = false;
    socketManager.setActiveChat(null);
  }

  handleReceiveMessage(message: MessageDto) {
    if (message.chatId === this.activeChatId) {
      const idx = this.messages.findIndex(
        (m) => (m.idempotencyKey && m.idempotencyKey === message.idempotencyKey) || m.id === message.id,
      );

      if (idx !== -1) {
        // Update existing message (could be optimistic or just a duplicate)
        this.messages[idx] = { ...this.messages[idx], ...message, status: "sent" };
      } else {
        this.messages.push({ ...message, status: "sent" });
      }
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
      if (idx !== -1) {
        // Replace optimistic message with the real one from server
        this.messages[idx] = { ...message, status: "sent" };
      } else {
        this.messages.push({ ...message, status: "sent" });
      }
    }
  }

  sendMessage(contentBody: string, otherUserId: string) {
    if (!this.activeChatId || !contentBody.trim()) return;

    const chatId = this.activeChatId;
    const idempotencyKey = socketManager.sendMessage(chatId, otherUserId, contentBody);

    if (!idempotencyKey) return;

    const optimisticMessage: FrontendMessageDto = {
      id: `temp-${idempotencyKey}`,
      chatId,
      senderId: authStore.user?.id || "",
      contentBody: contentBody.trim(),
      idempotencyKey,
      createdAt: new Date().toISOString(),
      status: "sending",
      reactions: [],
      receiverId: otherUserId,
      senderName: authStore.user?.name,
      senderUsername: authStore.user?.username,
      senderAvatar: authStore.user?.avatarUrl,
    };

    this.messages.push(optimisticMessage);

    // Timeout to mark as failed if no ACK arrives
    setTimeout(() => {
      const msg = this.messages.find((m) => m.id === optimisticMessage.id);
      if (msg && msg.status === "sending") {
        msg.status = "failed";
      }
    }, MESSAGE_ACK_TIMEOUT);
  }

  retryMessage(tempId: string) {
    const idx = this.messages.findIndex((m) => m.id === tempId);
    if (idx === -1) return;

    const msg = this.messages[idx];
    if (msg.status !== "failed") return;

    // Remove the failed message
    this.messages.splice(idx, 1);

    // Re-send
    if (msg && msg.contentBody) {
      this.sendMessage(msg.contentBody, msg.receiverId || "");
    }
  }
}

export const messageStore = new MessageStore();
