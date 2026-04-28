import type { Message, MessageAlert } from "$types/chat";
import type { MessageAckDto, RawMessageDto, TypingIndicatorDto, UserStatusDto } from "$types/chat.dto";
import type { Notification } from "$types/notification";
import type { Socket } from "socket.io-client";

import { authStore } from "$state/auth.svelte";
import { confirmStore } from "$state/confirm.svelte";
import { notificationStore } from "$state/notification.svelte";
import { routerStore } from "$state/router.svelte";
import { uiStore } from "$state/ui.svelte";
import { getDisallowedEmojis } from "$utils/emoji";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import {
  API_ROOT,
  MESSAGE_SEND_FALLBACK_TIMEOUT,
  TYPING_DEBOUNCE_DURATION,
  TYPING_INDICATOR_DURATION,
} from "../config";

/** Contract for the ChatStore properties/methods that SocketManager needs. */
export interface ChatStoreSocket {
  isConnected: boolean;
  isSendingMessage: boolean;
  activeChatId: string | null;
  typingStatus: SvelteMap<string, SvelteSet<string>>;
  onlineStatus: SvelteMap<string, { isOnline: boolean; lastSeen: Date | null }>;
  handleReceiveMessage(msg: Message): void;
  handleMessageAlert(data: MessageAlert): void;
  handleNotification(notification: Notification): void;
  handleChatAccepted(data: { chatId: string }): void;
  handleReactionUpdate(data: {
    messageId: string;
    chatId: string;
    reactions: Array<{ emoji: string; slug?: string; users: string[] }>;
  }): void;
  handleMessageDeleted(data: { messageId: string; chatId: string; isLastMessage?: boolean }): void;
  handleMessageSentAck(chatId: string, msg: Message): void;
  handleMessageUpdated(data: {
    messageId: string;
    chatId: string;
    contentBody: string;
    isEdited: boolean;
    editedAt: string;
  }): void;
}

export class SocketManager {
  socket: Socket | null = $state(null);
  private store: ChatStoreSocket;
  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private myTypingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(store: ChatStoreSocket) {
    this.store = store;
  }

  async connect() {
    if (this.socket || !authStore.accessToken) return;

    const { io } = await import("socket.io-client");
    this.socket = io(API_ROOT, {
      auth: { token: authStore.accessToken },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      this.store.isConnected = true;
    });

    this.socket.on("disconnect", () => {
      this.store.isConnected = false;
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    // General error handler (e.g. rate limits, session limits)
    this.socket.on("error", (data: { message: string; code?: string }) => {
      console.error("Socket error event:", data.message);
      if (
        data.code === "RATE_LIMIT_EXCEEDED" ||
        data.message.toLowerCase().includes("too fast") ||
        data.message.toLowerCase().includes("limit reached")
      ) {
        uiStore.addAlert(data.message, "danger");
      }
    });

    // Session Limit / Takeover handler
    this.socket.on("session_error", async (data: { reason: string; message: string }) => {
      if (data.reason === "takeover") {
        this.disconnect();

        const upgrade = await confirmStore.show({
          title: "Session Disconnected",
          message: "Your session was taken over by another window. Free accounts are limited to one active session.",
          confirmText: "Upgrade to Pro",
          cancelText: "Reconnect",
          variant: "warning",
        });

        if (upgrade) {
          routerStore.navigate("/pricing");
        } else {
          void this.connect();
        }
      }
    });

    // Listen for incoming messages
    this.socket.on("receive_message", (rawMessage: RawMessageDto) => {
      const message: Message = { ...rawMessage, id: rawMessage._id || rawMessage.id! };
      this.store.handleReceiveMessage(message);
    });

    // Listen for User Presence changes
    this.socket.on("user_status", (data: UserStatusDto) => {
      this.store.onlineStatus.set(data.userId, {
        isOnline: data.isOnline,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
      });
    });

    this.socket.on("user_status_batch", (batch: UserStatusDto[]) => {
      batch.forEach((data) => {
        this.store.onlineStatus.set(data.userId, {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
        });
      });
    });

    // Listen for Typing Indicators
    this.socket.on("typing_start", (data: TypingIndicatorDto) => {
      if (!this.store.typingStatus.has(data.chatId)) {
        this.store.typingStatus.set(data.chatId, new SvelteSet());
      }
      this.store.typingStatus.get(data.chatId)?.add(data.userId);

      const key = `${data.chatId}-${data.userId}`;
      if (this.typingTimeouts.has(key)) clearTimeout(this.typingTimeouts.get(key));

      this.typingTimeouts.set(
        key,
        setTimeout(() => {
          this.store.typingStatus.get(data.chatId)?.delete(data.userId);
        }, TYPING_INDICATOR_DURATION),
      );
    });

    this.socket.on("typing_stop", (data: TypingIndicatorDto) => {
      this.store.typingStatus.get(data.chatId)?.delete(data.userId);
    });

    // Listen for message alerts (toast / browser notification)
    this.socket.on("message_alert", (data: MessageAlert) => {
      this.store.handleMessageAlert(data);
    });

    // When a notification arrives, delegate to notificationStore and refresh chat list
    this.socket.on("notification", (notification: Notification) => {
      notificationStore.addRealTimeNotification(notification);
      this.store.handleNotification(notification);
    });

    this.socket.on("chat_accepted", (data: { chatId: string }) => {
      this.store.handleChatAccepted(data);
    });

    this.socket.on(
      "message_reaction_update",
      (data: {
        messageId: string;
        chatId: string;
        reactions: Array<{ emoji: string; slug?: string; users: string[] }>;
      }) => {
        this.store.handleReactionUpdate(data);
      },
    );

    this.socket.on("message_deleted", (data: { messageId: string; chatId: string; isLastMessage?: boolean }) => {
      this.store.handleMessageDeleted(data);
    });

    this.socket.on(
      "message_updated",
      (data: { messageId: string; chatId: string; contentBody: string; isEdited: boolean; editedAt: string }) => {
        this.store.handleMessageUpdated(data);
      },
    );
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.store.isConnected = false;

      // Cleanup local timeouts
      this.typingTimeouts.forEach(clearTimeout);
      this.typingTimeouts.clear();
      this.myTypingTimeouts.forEach(clearTimeout);
      this.myTypingTimeouts.clear();
    }
  }

  sendMessage(chatId: string, receiverId: string, contentBody: string) {
    if (!this.socket || !this.store.isConnected || !contentBody.trim()) return;

    this.store.isSendingMessage = true;
    this.emitTyping(chatId, receiverId, false);

    const idempotencyKey = crypto.randomUUID();

    const timeout = setTimeout(() => {
      this.store.isSendingMessage = false;
    }, MESSAGE_SEND_FALLBACK_TIMEOUT);

    this.socket.emit(
      "send_message",
      {
        chatId,
        receiverId,
        contentBody: contentBody.trim(),
        idempotencyKey,
      },
      (ack: MessageAckDto) => {
        clearTimeout(timeout);
        this.store.isSendingMessage = false;
        if (ack?.status === "ok" && ack.message) {
          const message = { ...ack.message, id: ack.message._id || ack.message.id! };
          this.store.handleMessageSentAck(chatId, message);
        }
      },
    );
  }

  emitTyping(chatId: string, receiverId: string, isTyping: boolean) {
    if (!this.socket || !this.store.isConnected) return;

    if (!isTyping) {
      this.socket.emit("typing_stop", { chatId, receiverId });
      return;
    }

    const key = `${chatId}-${receiverId}`;
    if (!this.myTypingTimeouts.has(key)) {
      this.socket.emit("typing_start", { chatId, receiverId });
    } else {
      clearTimeout(this.myTypingTimeouts.get(key));
    }

    this.myTypingTimeouts.set(
      key,
      setTimeout(() => {
        this.socket?.emit("typing_stop", { chatId, receiverId });
        this.myTypingTimeouts.delete(key);
      }, TYPING_DEBOUNCE_DURATION),
    );
  }

  reactToMessage(messageId: string, emoji: string, slug?: string) {
    if (!this.socket || !this.store.isConnected || !this.store.activeChatId) return;

    const found = getDisallowedEmojis(emoji);
    if (found.length > 0) {
      uiStore.addAlert(`The emoji ${found[0]} is not allowed.`, "danger");
      return;
    }

    this.socket.emit("react_message", {
      messageId,
      emoji,
      slug,
    });
  }

  deleteMessage(messageId: string) {
    if (!this.socket || !this.store.isConnected || !this.store.activeChatId) return;

    this.socket.emit("delete_message", {
      messageId,
    });
  }

  editMessage(messageId: string, contentBody: string) {
    if (!this.socket || !this.store.isConnected || !this.store.activeChatId) return;

    this.socket.emit("edit_message", {
      messageId,
      contentBody,
    });
  }
}
