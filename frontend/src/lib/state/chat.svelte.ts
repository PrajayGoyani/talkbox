import type { Chat, Message, MessageAlert } from "$types/chat";
import type { Notification } from "$types/notification";
import type { Socket } from "socket.io-client";

import { ASSETS } from "$lib/config";
import { chatService } from "$services/chat.service";
import { SocketManager } from "$services/socket.manager.svelte";
import { authStore } from "$state/auth.svelte";
import { routerStore } from "$state/router.svelte";
import { ApiError } from "$utils/errors";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

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
  typingStatus = new SvelteMap<string, SvelteSet<string>>();
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
  unreadChatsCount = $state(0);
  private pinnedChatIds: Set<string> = new Set();
  /** Map for O(1) chat lookups by ID */
  private chatsMap: Map<string, Chat> = new Map();

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
    if (typeof window !== "undefined") {
      // Effect to load pins when user changes
      $effect.root(() => {
        $effect(() => {
          if (authStore.user?.id) {
            this.loadPinnedChats();
            this.sortChats();
          }
        });
      });
    }
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
    this.onlineStatus.clear();
    this.typingStatus.clear();
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
      this.hasMoreMessages = loadedMessages.length >= 50; // Dynamic check
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
      this.hasMoreMessages = olderMessages.length >= 50;
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
      this.chatsMap.clear();
      this.chats = (result.data || []).map((chat) => {
        const isPinned = this.pinnedChatIds.has(chat.id);
        const lastUpdate = chat.lastMessage?.sentAt || chat.createdAt;
        const normalized = {
          ...chat,
          isPinned,
          _lastUpdateTs: new Date(lastUpdate).getTime(),
        };
        this.chatsMap.set(chat.id, normalized);
        return normalized;
      });
      this.unreadChatsCount = this.chats.filter((c) => (c.unreadCount ?? 0) > 0).length;
      this.sortChats();
      this.hasMoreChats = result.hasMore ?? false;
      this.chatCursor = result.nextCursor ?? null;

      return this.chats;
    } catch (e: any) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to fetch chats:", e);

      if (ApiError.handleRateLimit(e, "Easy there! You're searching too fast. Please wait a minute.")) {
        this.lastError = "rate-limited";
      } else {
        this.lastError = e.message || "Failed to fetch chats";
      }
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
      const newChats = result.data.map((chat) => {
        const normalized = {
          ...chat,
          isPinned: this.pinnedChatIds.has(chat.id),
          _lastUpdateTs: new Date(chat.lastMessage?.sentAt || chat.createdAt).getTime(),
        };
        this.chatsMap.set(chat.id, normalized);
        return normalized;
      });
      this.chats.push(...newChats);
      this.unreadChatsCount = this.chats.filter((c) => (c.unreadCount ?? 0) > 0).length;
      this.sortChats();
      this.hasMoreChats = result.hasMore;
      this.chatCursor = result.nextCursor;
    } catch (e: any) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to load more chats:", e);

      if (ApiError.handleRateLimit(e, "Slow down! You've hit a rate limit. Please wait a moment.")) {
        this.lastError = "rate-limited";
      } else {
        this.lastError = e.message || "Failed to load more chats";
      }
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
      this.requests.push(...result.data);
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
    if (this.typingStatus.has(message.chatId)) {
      this.typingStatus.get(message.chatId)?.delete(message.senderId);
    }

    const isViewing = message.chatId === this.activeChatId;
    const shouldInc = !isViewing && message.senderId !== authStore.user?.id;

    const chat = this.chatsMap.get(message.chatId);
    const currentUnread = chat?.unreadCount || 0;

    const updates: Partial<Chat> & { lastUpdate?: string } = {
      lastMessage: {
        contentBody: message.contentBody,
        senderId: message.senderId,
        sentAt: message.createdAt,
      },
      unreadCount: shouldInc ? currentUnread + 1 : currentUnread,
    };

    this.patchChatLocally(message.chatId, updates, true);
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
    const chat = this.chatsMap.get(data.chatId);
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

    const chat = this.chatsMap.get(data.chatId);
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
    const chat = this.chatsMap.get(chatId);
    if (!chat) {
      if (this.onChatListRefresh) this.onChatListRefresh();
      return;
    }

    const chatIndex = this.chats.findIndex((c) => c.id === chatId);

    // Check if unread status is changing to update counter
    const wasUnread = (chat.unreadCount ?? 0) > 0;
    Object.assign(chat, updates);
    const isUnread = (chat.unreadCount ?? 0) > 0;

    if (wasUnread !== isUnread) {
      this.unreadChatsCount += isUnread ? 1 : -1;
    }

    // Update internal timestamp for sorting
    const lastUpdate = chat.lastMessage?.sentAt || chat.createdAt;
    chat._lastUpdateTs = new Date(lastUpdate).getTime();

    if (moveToTop && chatIndex > 0) {
      this.chats.splice(chatIndex, 1);
      this.chats.unshift(chat);
      this.sortChats(false); // Pins are already normalized
    } else if (moveToTop || updates.lastMessage) {
      this.sortChats(false);
    }
  }

  // --- Pinning Logic ---

  private loadPinnedChats() {
    if (!authStore.user?.id) return;
    try {
      const saved = localStorage.getItem(`pinned_chats_${authStore.user.id}`);
      if (saved) {
        this.pinnedChatIds = new Set(JSON.parse(saved));
      } else {
        this.pinnedChatIds = new Set();
      }
    } catch (e) {
      console.warn("Failed to load pinned chats", e);
    }
  }

  private savePinnedChats() {
    if (!authStore.user?.id) return;
    try {
      localStorage.setItem(`pinned_chats_${authStore.user.id}`, JSON.stringify(Array.from(this.pinnedChatIds)));
    } catch (e) {
      console.warn("Failed to save pinned chats", e);
    }
  }

  toggleChatPin(chatId: string) {
    const chat = this.chatsMap.get(chatId);
    if (this.pinnedChatIds.has(chatId)) {
      this.pinnedChatIds.delete(chatId);
      if (chat) chat.isPinned = false;
    } else {
      this.pinnedChatIds.add(chatId);
      if (chat) chat.isPinned = true;
    }
    this.savePinnedChats();
    this.sortChats(false); // Pins are already updated
  }

  private sortChats(verifyPins = true) {
    if (verifyPins) {
      this.chats.forEach((chat: Chat) => {
        chat.isPinned = this.pinnedChatIds.has(chat.id);
        if (!chat._lastUpdateTs) {
          chat._lastUpdateTs = new Date(chat.lastMessage?.sentAt || chat.createdAt).getTime();
        }
      });
    }

    // Sort: Pinned first, then by internal timestamp (descending)
    this.chats.sort((a: Chat, b: Chat) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;

      if (aPinned !== bPinned) return bPinned - aPinned;
      const aTs = a._lastUpdateTs || 0;
      const bTs = b._lastUpdateTs || 0;
      return bTs - aTs;
    });

    // Re-assign to self to ensure Svelte 5 tracks the order change for any
    // consumers that might not be deeply tracking the mutation.
    this.chats = this.chats;
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
