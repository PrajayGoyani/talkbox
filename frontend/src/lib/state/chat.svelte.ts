import { io, type Socket } from "socket.io-client";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import type { MessageAckDto, RawMessageDto, TypingIndicatorDto, UserStatusDto } from "../types/chat.dto";
import type { Notification } from "../types/notification";

import {
  API_BASE,
  API_ROOT,
  ASSETS,
  MESSAGE_SEND_FALLBACK_TIMEOUT,
  TYPING_DEBOUNCE_DURATION,
  TYPING_INDICATOR_DURATION,
} from "../config";
import { authStore } from "./auth.svelte";
import { notificationStore } from "./notification.svelte";
import { routerStore } from "./router.svelte";

export type ChatStatus = "pending" | "accepted" | "rejected";

export interface User {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
}

export interface Message {
  id: string; // Map from backend _id
  chatId: string;
  senderId: string;
  contentBody: string;
  createdAt: string;
  idempotencyKey?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  status: ChatStatus;
  createdBy: string;
  otherUser: User;
  unreadCount?: number;
  lastMessage?: {
    contentBody: string;
    senderId: string;
    sentAt: string;
  };
  createdAt: string;
}

export interface MessageAlert {
  chatId: string;
  senderId: string;
  senderName?: string | null;
  senderUsername: string;
  senderAvatar?: string | null;
  preview: string;
}

class ChatStore {
  socket: Socket | null = $state(null);
  isConnected = $state(false);
  messages: Array<Message> = $state([]);
  hasMoreMessages = $state(true);
  isLoadingMessages = $state(false);
  isSendingMessage = $state(false);
  activeChatId: string | null = $state(null);

  onlineStatus = new SvelteMap<string, { isOnline: boolean; lastSeen: Date | null }>();
  typingStatus: Record<string, SvelteSet<string>> = $state({});
  chats: Array<Chat> = $state([]);
  requests: Array<Chat> = $state([]);
  pendingRequestCount = $state(0);
  lastError: string | null = $state(null);

  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private messagesAbortController: AbortController | null = null;
  private chatsAbortController: AbortController | null = null;

  // Callbacks for UI refresh
  private onChatListRefresh: (() => void) | null = null;
  private onToastCallback: ((data: MessageAlert) => void) | null = null;

  /** Register a callback that gets called when chats should be refreshed */
  onRefreshChats(cb: () => void) {
    this.onChatListRefresh = cb;
  }

  /** Register a callback for toast notifications */
  onToast(cb: (data: MessageAlert) => void) {
    this.onToastCallback = cb;
  }

  connect() {
    if (this.socket || !authStore.accessToken) return;

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

    // Listen for incoming messages
    this.socket.on("receive_message", (rawMessage: RawMessageDto) => {
      const message: Message = { ...rawMessage, id: rawMessage._id || rawMessage.id! };
      if (message.chatId === this.activeChatId) {
        this.messages = [...this.messages, message];
      }
      // Clear typing indicator instantly when a message is received
      if (this.typingStatus[message.chatId]) {
        this.typingStatus[message.chatId].delete(message.senderId);
      }

      // Update local last message preview and unread count
      const isViewing = message.chatId === this.activeChatId;
      const shouldInc = !isViewing && message.senderId !== authStore.user?.id;

      const chat = this.chats.find((c) => c.id === message.chatId);
      const currentUnread = chat?.unreadCount || 0;

      this.patchChatLocally(
        message.chatId,
        {
          lastMessage: {
            contentBody: message.contentBody,
            senderId: message.senderId,
            sentAt: message.createdAt,
          },
          unreadCount: shouldInc ? currentUnread + 1 : currentUnread,
        },
        true,
      );
    });

    // Listen for User Presence changes
    this.socket.on("user_status", (data: UserStatusDto) => {
      this.onlineStatus.set(data.userId, {
        isOnline: data.isOnline,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
      });
    });

    // Listen for Typing Indicators
    this.socket.on("typing_start", (data: TypingIndicatorDto) => {
      if (!this.typingStatus[data.chatId]) {
        this.typingStatus[data.chatId] = new SvelteSet();
      }
      this.typingStatus[data.chatId].add(data.userId);

      // Auto-clear after timeout just in case typing_stop never arrives
      const key = `${data.chatId}-${data.userId}`;
      if (this.typingTimeouts.has(key)) clearTimeout(this.typingTimeouts.get(key));

      this.typingTimeouts.set(
        key,
        setTimeout(() => {
          if (this.typingStatus[data.chatId]) {
            this.typingStatus[data.chatId].delete(data.userId);
          }
        }, TYPING_INDICATOR_DURATION),
      );
    });

    this.socket.on("typing_stop", (data: TypingIndicatorDto) => {
      if (this.typingStatus[data.chatId]) {
        this.typingStatus[data.chatId].delete(data.userId);
      }
    });

    // Listen for message alerts (toast / browser notification)
    this.socket.on("message_alert", (data: MessageAlert) => {
      const isChatOpen = data.chatId === this.activeChatId;
      const isTabFocused = document.hasFocus();

      // Maintain background logic
      if (isChatOpen && isTabFocused) {
        void this.markChatRead(data.chatId);
      }

      if (!isTabFocused) {
        this.showBrowserNotification(data);
      }

      if (this.onToastCallback && !isChatOpen) {
        this.onToastCallback(data);
      }
    });

    // When a notification arrives, delegate to notificationStore and refresh chat list
    this.socket.on("notification", (notification: Notification) => {
      notificationStore.addRealTimeNotification(notification);

      if (notification.type === "chat_request") {
        this.pendingRequestCount += 1;
        // Trigger toast for chat request
        if (this.onToastCallback) {
          this.onToastCallback({
            chatId: notification.referenceId,
            senderUsername: "System", // We don't have sender details here easily, but message has it
            preview: notification.message,
          } as any);
        }
        // Only fetch list if Requests tab is active
        if (routerStore.segments[1] === "requests") {
          void this.fetchRequests();
        }
      }

      if (this.onChatListRefresh) {
        this.onChatListRefresh();
      }
    });

    this.socket.on("chat_accepted", (_data: { chatId: string }) => {
      // Refresh chat list so the new active chat appears
      void this.fetchChats();
      // Also potentially refresh requests to remove the pending one
      if (routerStore.segments[1] === "requests") {
        void this.fetchRequests();
      }

      if (this.onChatListRefresh) {
        this.onChatListRefresh();
      }
    });
  }

  /** Show browser-level notification when tab is not focused */
  private showBrowserNotification(data: MessageAlert) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const displayName = data.senderName || data.senderUsername;

    const notification = new Notification(displayName, {
      body: data.preview,
      icon: ASSETS.NOTIFICATION_ICON,
      tag: `msg-${data.chatId}-${Date.now()}`,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.messagesAbortController?.abort();
    this.chatsAbortController?.abort();
    this.messagesAbortController = null;
    this.chatsAbortController = null;
    this.messages = [];
    this.activeChatId = null;
  }

  /** Load messages for a chat via REST */
  async loadMessages(chatId: string) {
    this.messagesAbortController?.abort();
    this.messagesAbortController = new AbortController();

    this.activeChatId = chatId;
    this.messages = [];
    this.hasMoreMessages = true;
    this.isLoadingMessages = true;
    try {
      const resp = await fetch(`${API_BASE}/chat/${chatId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
        signal: this.messagesAbortController.signal,
      });
      if (!resp.ok) return;
      const result = await resp.json();

      // Guard against race conditions: only update if this chat is still active
      if (this.activeChatId !== chatId) return;

      const rawLoaded: any[] = result.data || result || [];
      const loadedMessages: Message[] = rawLoaded.map((m) => ({ ...m, id: m._id || m.id }));
      this.messages = loadedMessages;
      this.hasMoreMessages = loadedMessages.length === 50;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load messages:", e);
      this.lastError = "Failed to load messages. Please try again.";
    } finally {
      this.isLoadingMessages = false;
    }
  }

  /** Load older messages using cursor */
  async loadOlderMessages() {
    if (!this.activeChatId || !this.hasMoreMessages || this.isLoadingMessages || this.messages.length === 0) return;

    const signal = this.messagesAbortController?.signal;
    this.isLoadingMessages = true;
    const oldestMessageId = this.messages[0].id;

    try {
      const resp = await fetch(`${API_BASE}/chat/${this.activeChatId}/messages?limit=50&cursor=${oldestMessageId}`, {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
        signal,
      });
      if (!resp.ok) return;
      const result = await resp.json();
      const rawOlder: any[] = result.data || result || [];
      const olderMessages: Message[] = rawOlder.map((m) => ({ ...m, id: m._id || m.id }));

      if (olderMessages.length > 0) {
        this.messages = [...olderMessages, ...this.messages];
      }
      this.hasMoreMessages = olderMessages.length === 50;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load older messages:", e);
      this.lastError = "Failed to load older messages.";
    } finally {
      this.isLoadingMessages = false;
    }
  }

  /**
   * Update a single chat in the local 'chats' list without a full fetch.
   * If moveToTop is true, also re-orders the list (useful for new messages).
   */
  private patchChatLocally(chatId: string, updates: Partial<Chat>, moveToTop = false) {
    const chatIndex = this.chats.findIndex((c: Chat) => c.id === chatId);
    if (chatIndex === -1) {
      if (this.onChatListRefresh) this.onChatListRefresh();
      return;
    }

    const chat = { ...this.chats[chatIndex], ...updates };
    const newChats = [...this.chats];

    if (moveToTop) {
      newChats.splice(chatIndex, 1);
      newChats.unshift(chat);
    } else {
      newChats[chatIndex] = chat;
    }

    this.chats = newChats;
  }

  /** Load chats list via REST */
  async fetchChats(query = "") {
    this.chatsAbortController?.abort();
    this.chatsAbortController = new AbortController();
    this.lastError = null;
    try {
      const endpoint =
        query.trim().length > 0 ? `${API_BASE}/chat/search?q=${encodeURIComponent(query.trim())}` : `${API_BASE}/chat`;

      const resp = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        credentials: "include",
        signal: this.chatsAbortController.signal,
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message || "Failed to fetch chats");
      }
      const result = await resp.json();
      this.chats = result.data || [];
      return this.chats;
    } catch (e: any) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to fetch chats:", e);
      this.lastError = e.message || "Failed to fetch chats";
    }
  }

  /** Load pending chat requests via REST */
  async fetchRequests() {
    this.lastError = null;
    try {
      const resp = await fetch(`${API_BASE}/chat/requests`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        credentials: "include",
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message || "Failed to fetch requests");
      }
      const result = await resp.json();
      this.requests = result.data || [];
      return this.requests;
    } catch (e: any) {
      console.error("Failed to fetch requests:", e);
      this.lastError = e.message || "Failed to fetch requests";
    }
  }

  /** Mark a chat as read via REST */
  async markChatRead(chatId: string) {
    try {
      await fetch(`${API_BASE}/chat/${chatId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      this.patchChatLocally(chatId, { unreadCount: 0 });
    } catch (e: unknown) {
      console.error("Failed to mark chat as read:", e);
    }
  }

  /** Accept a chat request */
  async acceptChat(chatId: string) {
    this.lastError = null;
    try {
      const resp = await fetch(`${API_BASE}/chat/${chatId}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error?.message || "Failed to accept chat");
      await Promise.all([this.fetchChats(), this.fetchRequests()]);
    } catch (e: any) {
      console.error("Failed to accept chat:", e);
      this.lastError = e.message || "Failed to accept chat";
      throw e;
    }
  }

  /** Reject a chat request */
  async rejectChat(chatId: string) {
    this.lastError = null;
    try {
      const resp = await fetch(`${API_BASE}/chat/${chatId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error?.message || "Failed to reject chat");
      await this.fetchRequests();
    } catch (e: any) {
      console.error("Failed to reject chat:", e);
      this.lastError = e.message || "Failed to reject chat";
      throw e;
    }
  }

  /** Send a new chat request to a username */
  async sendChatRequest(username: string) {
    try {
      const resp = await fetch(`${API_BASE}/chat/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ username: username.trim() }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error?.message || "Failed to send request");
      await this.fetchRequests();
      return result;
    } catch (e: unknown) {
      console.error("Failed to send chat request:", e);
      throw e;
    }
  }

  /** Send a message via socket with idempotency */
  async sendMessage(chatId: string, receiverId: string, contentBody: string) {
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
        clearTimeout(timeout);
        this.isSendingMessage = false;
        if (ack?.status === "ok" && ack.message) {
          // Map _id from backend to id
          const message = { ...ack.message, id: ack.message._id || ack.message.id! };
          const exists = this.messages.some((m: Message) => m.idempotencyKey === message.idempotencyKey);
          if (!exists) {
            this.messages = [...this.messages, message];
          }
          this.patchChatLocally(
            chatId,
            {
              lastMessage: {
                contentBody: message.contentBody,
                senderId: message.senderId,
                sentAt: message.createdAt,
              },
            },
            true,
          );
        }
      },
    );
  }

  // --- Typing Indicator Emitters ---
  private myTypingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

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
}

export const chatStore = new ChatStore();
