import type { UserDto } from "shared/types/auth.dto";
import type {
  MessageAckDto,
  MessageDto,
  MessageReactionUpdateDto,
  TypingIndicatorDto,
  UserStatusDto,
} from "shared/types/chat.dto";
import type { NotificationDto } from "shared/types/notification.dto";
import type { Socket } from "socket.io-client";

import { authStore } from "$state/auth.svelte";
import { confirmStore } from "$state/confirm.svelte";
import { routerStore } from "$state/router.svelte";
import { uiStore } from "$state/ui.svelte";
import { getDisallowedEmojis } from "$utils/emoji";

import { API_ROOT, MESSAGE_SEND_FALLBACK_TIMEOUT, TYPING_DEBOUNCE_DURATION } from "../config";
import { RealtimeEvent, realtimeEvents } from "./realtime-events";

/**
 * Manages the Socket.io connection and translates raw socket events
 * into domain-specific RealtimeEvents.
 */
export class SocketManager {
  socket: Socket | null = $state(null);
  isConnected = $state(false);
  isSendingMessage = $state(false);

  private myTypingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    // No longer coupled to a specific store
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
      this.isConnected = true;
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
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

    // --- Domain Event Mapping ---

    this.socket.on("receive_message", (message: MessageDto) => {
      realtimeEvents.emit(RealtimeEvent.MESSAGE_RECEIVED, message);
    });

    this.socket.on("user_status", (data: UserStatusDto) => {
      realtimeEvents.emit(RealtimeEvent.USER_STATUS_UPDATED, data);
    });

    this.socket.on("user_status_batch", (batch: UserStatusDto[]) => {
      realtimeEvents.emit(RealtimeEvent.USER_STATUS_BATCH, batch);
    });

    this.socket.on("typing_start", (data: TypingIndicatorDto) => {
      realtimeEvents.emit(RealtimeEvent.TYPING_STARTED, data);
    });

    this.socket.on("typing_stop", (data: TypingIndicatorDto) => {
      realtimeEvents.emit(RealtimeEvent.TYPING_STOPPED, data);
    });

    this.socket.on("notification", (notification: NotificationDto) => {
      realtimeEvents.emit(RealtimeEvent.NOTIFICATION_RECEIVED, notification);
    });

    this.socket.on("chat_accepted", (data: { chatId: string }) => {
      realtimeEvents.emit(RealtimeEvent.CHAT_ACCEPTED, data);
    });

    this.socket.on("message_reaction_update", (data: MessageReactionUpdateDto) => {
      realtimeEvents.emit(RealtimeEvent.REACTION_UPDATED, data);
    });

    this.socket.on("message_deleted", (data: { messageId: string; chatId: string; isLastMessage?: boolean }) => {
      realtimeEvents.emit(RealtimeEvent.MESSAGE_DELETED, data);
    });

    this.socket.on(
      "message_updated",
      (data: { messageId: string; chatId: string; contentBody: string; isEdited: boolean; editedAt: string }) => {
        realtimeEvents.emit(RealtimeEvent.MESSAGE_UPDATED, data);
      },
    );

    this.socket.on("profile_updated", (data: { userId: string } & Partial<UserDto>) => {
      realtimeEvents.emit(RealtimeEvent.PROFILE_UPDATED, data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;

      // Cleanup local timeouts
      this.myTypingTimeouts.forEach(clearTimeout);
      this.myTypingTimeouts.clear();
    }
  }

  sendMessage(chatId: string, receiverId: string, contentBody: string) {
    if (!this.socket || !this.isConnected || !contentBody.trim()) return;

    this.isSendingMessage = true;
    this.emitTyping(chatId, receiverId, false);

    const idempotencyKey = crypto.randomUUID();

    const timeout = setTimeout(() => {
      this.isSendingMessage = false;
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
        // console.log("[SocketManager] Send message ACK received from server:", ack);
        clearTimeout(timeout);
        this.isSendingMessage = false;

        if (ack?.status === "ok" && ack.message) {
          // console.log("[SocketManager] Emitting MESSAGE_SENT_ACK to bus", {
          //   chatId,
          //   msgId: ack.message.id,
          //   idempotencyKey: ack.message.idempotencyKey
          // });
          realtimeEvents.emit(RealtimeEvent.MESSAGE_SENT_ACK, { chatId, message: ack.message });
        } else if (ack?.status === "error") {
          // console.error("[SocketManager] Server returned error in ACK:", ack.error);
        }
      },
    );
  }

  emitTyping(chatId: string, receiverId: string, isTyping: boolean) {
    if (!this.socket || !this.isConnected) return;

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
    if (!this.socket || !this.isConnected) return;

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
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("delete_message", {
      messageId,
    });
  }

  editMessage(messageId: string, contentBody: string) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("edit_message", {
      messageId,
      contentBody,
    });
  }
}
