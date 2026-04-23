import type { Chat, Message, MessageAlert } from "$types/chat";
import type { Notification } from "$types/notification";
import type { Socket } from "socket.io-client";

import { chatService } from "$services/chat.service";
import { SocketManager } from "$services/socket.manager.svelte";
import { authStore } from "$state/auth.svelte";
import { routerStore } from "$state/router.svelte";
import { SvelteMap } from "svelte/reactivity";

import { ASSETS } from "../config";

export * from "$types/chat";

const LOADER_AWAIT_MS = 300;

class ChatStore {
  // State
  isConnected = $state(false);
  messages: Array<Message> = $state([]);
  hasMoreMessages = $state(true);
  isLoadingMessages = $state(false);
  isSendingMessage = $state(false);
  activeChatId: string | null = $state(null);

  onlineStatus = new SvelteMap<string, { isOnline: boolean; lastSeen: Date | null }>();
  typingStatus: Record<string, any> = $state({}); // SvelteSet managed by SocketManager
  chats: Array<Chat> = $state([]);
  hasMoreChats = $state(true);
  chatCursor: string | null = $state(null);
  isLoadingMoreChats = $state(false);

  requests: Array<Chat> = $state([]);
  hasMoreRequests = $state(true);
  requestCursor: string | null = $state(null);
  isLoadingMoreRequests = $state(false);

  pendingRequestCount = $state(0);
  lastError: string | null = $state(null);
  currentSearchQuery = $state("");

  private messagesAbortController: AbortController | null = null;
  private chatsAbortController: AbortController | null = null;
  private requestsAbortController: AbortController | null = null;

  // Callbacks for UI refresh
  private onChatListRefresh: (() => void) | null = null;
  private onToastCallback: ((data: MessageAlert) => void) | null = null;

  // Services
  private socketManager: SocketManager;

  constructor() {
    this.socketManager = new SocketManager(this);
  }

  get socket(): Socket | null {
    return this.socketManager.socket;
  }

  /** Register a callback that gets called when chats should be refreshed */
  onRefreshChats(cb: () => void) {
    this.onChatListRefresh = cb;
  }

  /** Register a callback for toast notifications */
  onToast(cb: (data: MessageAlert) => void) {
    this.onToastCallback = cb;
  }

  // --- Connection Management ---

  async connect() {
    return this.socketManager.connect();
  }

  disconnect() {
    this.socketManager.disconnect();
    this.messagesAbortController?.abort();
    this.chatsAbortController?.abort();
    this.messagesAbortController = null;
    this.chatsAbortController = null;
    this.messages = [];
    this.activeChatId = null;
  }

  // --- REST API Operations (Delegated to ChatService) ---

  async loadMessages(chatId: string) {
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
      this.hasMoreMessages = loadedMessages.length === 50;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load messages:", e);
      this.lastError = "Failed to load messages. Please try again.";
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
      this.hasMoreMessages = olderMessages.length === 50;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load older messages:", e);
      this.lastError = "Failed to load older messages.";
    } finally {
      this.isLoadingMessages = false;
    }
  }

  async fetchChats(query = "") {
    this.chatsAbortController?.abort();
    this.chatsAbortController = new AbortController();
    this.lastError = null;
    try {
      const result = await chatService.fetchChats(query, 20, null, this.chatsAbortController.signal);

      this.currentSearchQuery = query;
      this.chats = result.data || [];
      this.hasMoreChats = result.hasMore ?? false;
      this.chatCursor = result.nextCursor ?? null;

      return this.chats;
    } catch (e: any) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to fetch chats:", e);
      this.lastError = e.message || "Failed to fetch chats";
    }
  }

  async loadMoreChats() {
    if (!this.hasMoreChats || this.isLoadingMoreChats || this.chatsAbortController?.signal.aborted) return;

    this.isLoadingMoreChats = true;
    try {
      const result = await chatService.fetchChats(
        this.currentSearchQuery,
        20,
        this.chatCursor,
        this.chatsAbortController?.signal,
      );
      this.chats = [...this.chats, ...result.data];
      this.hasMoreChats = result.hasMore;
      this.chatCursor = result.nextCursor;
    } catch (e: any) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load more chats:", e);
      this.lastError = e.message || "Failed to load more chats";
    } finally {
      this.isLoadingMoreChats = false;
    }
  }

  async fetchRequests() {
    this.requestsAbortController?.abort();
    this.requestsAbortController = new AbortController();
    this.lastError = null;
    try {
      const result = await chatService.fetchRequests(20, null);
      this.requests = result.data;
      this.hasMoreRequests = result.hasMore;
      this.requestCursor = result.nextCursor;
      return this.requests;
    } catch (e: any) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to fetch requests:", e);
      this.lastError = e.message || "Failed to fetch requests";
    }
  }

  async loadMoreRequests() {
    if (!this.hasMoreRequests || this.isLoadingMoreRequests) return;

    this.isLoadingMoreRequests = true;
    try {
      const result = await chatService.fetchRequests(20, this.requestCursor);
      this.requests = [...this.requests, ...result.data];
      this.hasMoreRequests = result.hasMore;
      this.requestCursor = result.nextCursor;
    } catch (e: any) {
      console.error("Failed to load more requests:", e);
      this.lastError = e.message || "Failed to load more requests";
    } finally {
      this.isLoadingMoreRequests = false;
    }
  }

  async markChatRead(chatId: string) {
    try {
      await chatService.markChatRead(chatId);
      this.patchChatLocally(chatId, { unreadCount: 0 });
    } catch (e: unknown) {
      console.error("Failed to mark chat as read:", e);
    }
  }

  async acceptChat(chatId: string) {
    this.lastError = null;
    try {
      await chatService.acceptChat(chatId);
      await Promise.all([this.fetchChats(), this.fetchRequests()]);
    } catch (e: any) {
      console.error("Failed to accept chat:", e);
      this.lastError = e.message || "Failed to accept chat";
      throw e;
    }
  }

  async rejectChat(chatId: string) {
    this.lastError = null;
    try {
      await chatService.rejectChat(chatId);
      await this.fetchRequests();
    } catch (e: any) {
      console.error("Failed to reject chat:", e);
      this.lastError = e.message || "Failed to reject chat";
      throw e;
    }
  }

  async sendChatRequest(username: string) {
    try {
      const result = await chatService.sendChatRequest(username);
      await this.fetchRequests();
      return result;
    } catch (e: unknown) {
      console.error("Failed to send chat request:", e);
      throw e;
    }
  }

  // --- Socket Operations (Delegated to SocketManager) ---

  async sendMessage(chatId: string, receiverId: string, contentBody: string) {
    this.socketManager.sendMessage(chatId, receiverId, contentBody);
  }

  emitTyping(chatId: string, receiverId: string, isTyping: boolean) {
    this.socketManager.emitTyping(chatId, receiverId, isTyping);
  }

  reactToMessage(messageId: string, emoji: string, slug?: string) {
    this.socketManager.reactToMessage(messageId, emoji, slug);
  }

  deleteMessage(messageId: string) {
    this.socketManager.deleteMessage(messageId);
  }

  editMessage(messageId: string, contentBody: string) {
    this.socketManager.editMessage(messageId, contentBody);
  }

  // --- Internal Handlers for SocketManager ---

  handleReceiveMessage(message: Message) {
    if (message.chatId === this.activeChatId) {
      this.messages.push(message);
    }

    // Clear typing indicator instantly
    if (this.typingStatus[message.chatId]) {
      this.typingStatus[message.chatId].delete(message.senderId);
    }

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
  }

  handleMessageAlert(data: MessageAlert) {
    const isChatOpen = data.chatId === this.activeChatId;
    const isTabFocused = document.hasFocus();

    if (isChatOpen && isTabFocused) {
      void this.markChatRead(data.chatId);
    }

    if (!isTabFocused) {
      this.showBrowserNotification(data);
    }

    if (this.onToastCallback && !isChatOpen) {
      this.onToastCallback(data);
    }
  }

  handleNotification(notification: Notification) {
    if (notification.type === "chat_request") {
      this.pendingRequestCount += 1;
      if (this.onToastCallback) {
        this.onToastCallback({
          chatId: notification.referenceId,
          senderUsername: "System",
          preview: notification.message,
        } as any);
      }
      if (routerStore.segments[1] === "requests") {
        void this.fetchRequests();
      }
    }

    if (this.onChatListRefresh) {
      this.onChatListRefresh();
    }
  }

  handleChatAccepted(_data: { chatId: string }) {
    void this.fetchChats();
    if (routerStore.segments[1] === "requests") {
      void this.fetchRequests();
    }
    if (this.onChatListRefresh) {
      this.onChatListRefresh();
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

  handleMessageDeleted(data: { messageId: string; chatId: string; isLastMessage?: boolean }) {
    if (data.chatId === this.activeChatId) {
      const msg = this.messages.find((m) => m.id === data.messageId);
      if (msg) {
        msg.contentBody = "This message was deleted";
        msg.isDeleted = true;
        msg.reactions = [];
      }
    }
    const chat = this.chats.find((c) => c.id === data.chatId);
    if (chat && chat.lastMessage) {
      const isLatest =
        data.isLastMessage ??
        (this.activeChatId === data.chatId &&
          this.messages.length > 0 &&
          this.messages[this.messages.length - 1].id === data.messageId);

      if (isLatest) {
        this.patchChatLocally(data.chatId, {
          lastMessage: {
            ...chat.lastMessage,
            contentBody: "Message deleted",
          },
        });
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

    const chat = this.chats.find((c) => c.id === data.chatId);
    if (chat && chat.lastMessage) {
      const isLatest =
        this.activeChatId === data.chatId &&
        this.messages.length > 0 &&
        this.messages[this.messages.length - 1].id === data.messageId;

      if (isLatest) {
        this.patchChatLocally(data.chatId, {
          lastMessage: {
            ...chat.lastMessage,
            contentBody: data.contentBody,
          },
        });
      }
    }
  }

  handleMessageSentAck(chatId: string, message: Message) {
    const exists = this.messages.some((m: Message) => m.idempotencyKey === message.idempotencyKey);
    if (!exists) {
      this.messages.push(message);
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

  // --- UI Helpers ---

  private patchChatLocally(chatId: string, updates: Partial<Chat>, moveToTop = false) {
    const chatIndex = this.chats.findIndex((c: Chat) => c.id === chatId);
    if (chatIndex === -1) {
      if (this.onChatListRefresh) this.onChatListRefresh();
      return;
    }

    // Direct mutation for Svelte 5 reactivity
    const chat = this.chats[chatIndex];
    Object.assign(chat, updates);

    if (moveToTop && chatIndex > 0) {
      this.chats.splice(chatIndex, 1);
      this.chats.unshift(chat);
    }
  }

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
}

export const chatStore = new ChatStore();
