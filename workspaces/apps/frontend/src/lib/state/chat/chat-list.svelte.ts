import type { Chat } from "$lib/types/chat";
import type { AuthObserver } from "$state/auth-observer";

import { chatService } from "$services/chat.service";
import { notificationService } from "$services/notification.service";
import { realtimeEvents, RealtimeEvent } from "$services/realtime-events";
import { messageStore } from "$state/active-chat.svelte";
import { authStore } from "$state/auth.svelte";
import { uiStore } from "$state/ui.svelte";

import { chatRequestsStore } from "./chat-requests.svelte";
import { pinnedChatsStore } from "./pinned-chats.svelte";

export class ChatListStore implements AuthObserver {
  // --- Reactive State (Runes) ---
  chats = $state<Array<Chat>>([]);
  hasMoreChats = $state(true);
  chatCursor = $state<string | null>(null);
  isLoadingChats = $state(false);
  isLoadingMoreChats = $state(false);

  unreadChatsCount = $state(0);
  currentSearchQuery = $state("");
  lastError = $state<string | null>(null);

  public chatsMap = $state(new Map<string, Chat>());
  private userIdToChatIds = new Map<string, Set<string>>();
  private pendingChatFetches = new Map<string, Promise<void>>();
  private chatsAbortController: AbortController | null = null;
  private listenerCleanups: Array<() => void> = [];

  // Facade helpers for UI components still using chatListStore
  get requests() {
    return chatRequestsStore.items;
  }
  get pendingRequestCount() {
    return chatRequestsStore.items.length;
  }

  constructor() {
    this.initEventListeners();
    authStore.subscribe(this);
  }

  init(_userId: string) {
    void this.fetchChats();
    this.sortChats();
  }

  private initEventListeners() {
    this.cleanupSocketListeners();

    this.listenerCleanups = [
      realtimeEvents.on(RealtimeEvent.MESSAGE_RECEIVED, (msg) => this.handleReceiveMessage(msg)),
      realtimeEvents.on(RealtimeEvent.NOTIFICATION_RECEIVED, (n) => this.handleNotification(n)),
      realtimeEvents.on(RealtimeEvent.CHAT_ACCEPTED, () => {
        void this.fetchChats();
        void chatRequestsStore.loadInitial();
      }),
      realtimeEvents.on(RealtimeEvent.MESSAGE_DELETED, (d) => this.handleMessageDeleted(d)),
      realtimeEvents.on(RealtimeEvent.MESSAGE_UPDATED, (d) => this.handleMessageUpdated(d)),
      realtimeEvents.on(RealtimeEvent.PROFILE_UPDATED, (d) => this.handleProfileUpdate(d)),
    ];
  }

  public cleanupSocketListeners() {
    this.listenerCleanups.forEach((cleanup) => cleanup());
    this.listenerCleanups = [];
  }

  // --- Handlers ---

  private handleReceiveMessage(message: any) {
    const isViewing = message.chatId === messageStore.activeChatId;
    const isOtherUser = message.senderId !== authStore.user?.id;
    const shouldInc = !isViewing && isOtherUser;

    if (isOtherUser) {
      // 1. Mark as read immediately if viewing and focused (replaces old message_alert logic)
      if (isViewing && typeof document !== "undefined" && document.hasFocus()) {
        void chatService.markChatRead(message.chatId).then(() => {
          this.patchChatLocally(message.chatId, { unreadCount: 0 });
        });
      }

      const contentBody = message.contentBody || "";
      const preview = contentBody.length > 60 ? contentBody.substring(0, 60) + "..." : contentBody;

      // 2. Trigger notification (sound/browser)
      notificationService.notify({
        chatId: message.chatId,
        senderId: message.senderId,
        senderName: message.senderName || "Someone",
        senderUsername: message.senderUsername || "Someone",
        senderAvatar: message.senderAvatar,
        preview,
        type: "new_message",
      });
    }

    const currentChat = this.chatsMap.get(message.chatId);
    const currentUnread = currentChat?.unreadCount || 0;

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

  private handleNotification(notification: any) {
    if (notification.type === "chat_request") {
      void chatRequestsStore.loadInitial();
      notificationService.notify({
        chatId: notification.referenceId,
        senderId: "system",
        senderUsername: "System",
        preview: notification.message,
        type: "chat_request",
      });
    }
  }

  private handleMessageDeleted(data: { messageId: string; chatId: string; isLastMessage?: boolean }) {
    const chat = this.chatsMap.get(data.chatId);
    if (chat?.lastMessage && data.isLastMessage) {
      this.patchChatLocally(data.chatId, {
        lastMessage: { ...chat.lastMessage, contentBody: "This message was deleted" },
      });
    }
  }

  private handleMessageUpdated(data: { chatId: string; messageId: string; contentBody: string }) {
    const chat = this.chatsMap.get(data.chatId);
    // Only update preview if it was the last message
    if (chat?.lastMessage && chat.lastMessage.sentAt) {
      // Note: In a real app we'd check if this messageId matches lastMessage.id
      // For now, if it's updated and we want to reflect it in the list:
      this.patchChatLocally(data.chatId, {
        lastMessage: { ...chat.lastMessage, contentBody: data.contentBody },
      });
    }
  }

  private handleProfileUpdate(data: { userId: string } & Record<string, any>) {
    const { userId, ...updates } = data;
    const chatIds = this.userIdToChatIds.get(userId);
    if (!chatIds) return;

    chatIds.forEach((chatId) => {
      const chat = this.chatsMap.get(chatId);
      if (chat?.otherUser) {
        Object.assign(chat.otherUser, updates);
      }
    });
  }

  private updateUserIdMap(chat: Chat) {
    if (!chat.otherUser?.id) return;
    if (!this.userIdToChatIds.has(chat.otherUser.id)) {
      this.userIdToChatIds.set(chat.otherUser.id, new Set());
    }
    this.userIdToChatIds.get(chat.otherUser.id)?.add(chat.id);
  }

  // --- Actions ---

  async fetchChats(query = "") {
    this.chatsAbortController?.abort();
    this.chatsAbortController = new AbortController();
    this.isLoadingChats = true;
    this.currentSearchQuery = query;
    this.lastError = null;

    try {
      const result = await chatService.fetchChats(query, 20, null, this.chatsAbortController.signal);
      this.chatsMap.clear();

      this.chats = result.data.map((chat: any) => ({
        ...chat,
        isPinned: pinnedChatsStore.isPinned(chat.id),
        _lastUpdateTs: new Date(chat.lastMessage?.sentAt || chat.createdAt).getTime(),
      }));

      // Populate reactive map and user map
      this.userIdToChatIds.clear();
      this.chats.forEach((c) => {
        this.chatsMap.set(c.id, c);
        this.updateUserIdMap(c);
      });

      this.unreadChatsCount = this.chats.filter((c) => (c.unreadCount ?? 0) > 0).length;
      this.hasMoreChats = result.hasMore;
      this.chatCursor = result.nextCursor;
      this.sortChats(false); // Pins already set during map
    } catch (e: any) {
      if (e.name === "AbortError") return;
      this.lastError = e.message || "Failed to fetch chats";
    } finally {
      this.isLoadingChats = false;
    }
  }

  /**
   * Ensures a specific chat is in the store (fetching it if not).
   * Useful for deep-linking to chats beyond the first page of results.
   */
  async ensureChatLoaded(chatId: string) {
    if (this.chatsMap.has(chatId)) return;

    // Deduplicate in-flight requests
    const existing = this.pendingChatFetches.get(chatId);
    if (existing) return existing;

    const fetchPromise = (async () => {
      try {
        const chat = await chatService.fetchChat(chatId);

        // Secondary check: someone else might have loaded it while we were waiting
        if (this.chatsMap.has(chatId)) return;

        // Enhance with local properties
        const enhancedChat = {
          ...chat,
          isPinned: pinnedChatsStore.isPinned(chat.id),
          _lastUpdateTs: new Date(chat.lastMessage?.sentAt || chat.createdAt).getTime(),
        };

        // Add to store
        this.chats = [enhancedChat, ...this.chats];
        this.chatsMap.set(chat.id, enhancedChat);
        this.updateUserIdMap(enhancedChat);
      } catch (e) {
        console.error("Failed to ensure chat is loaded:", e);
        uiStore.addAlert("Failed to load chat details", "danger");
      } finally {
        this.pendingChatFetches.delete(chatId);
      }
    })();

    this.pendingChatFetches.set(chatId, fetchPromise);
    return fetchPromise;
  }

  async loadMoreChats() {
    if (!this.hasMoreChats || this.isLoadingMoreChats) return;
    this.isLoadingMoreChats = true;
    try {
      const result = await chatService.fetchChats(
        this.currentSearchQuery,
        20,
        this.chatCursor,
        this.chatsAbortController?.signal,
      );

      const newChats = result.data.map((chat: any) => ({
        ...chat,
        isPinned: pinnedChatsStore.isPinned(chat.id),
        _lastUpdateTs: new Date(chat.lastMessage?.sentAt || chat.createdAt).getTime(),
      }));

      const oldLength = this.chats.length;
      this.chats = [...this.chats, ...newChats];

      // Update map with new proxied items using O(1) indexed lookup
      newChats.forEach((_, i) => {
        const proxied = this.chats[oldLength + i];
        if (proxied) {
          this.chatsMap.set(proxied.id, proxied);
          this.updateUserIdMap(proxied);
        }
      });
      this.hasMoreChats = result.hasMore;
      this.chatCursor = result.nextCursor;
      this.sortChats(false); // Pins already set during map
    } finally {
      this.isLoadingMoreChats = false;
    }
  }

  // Delegated Actions
  async fetchRequests() {
    return chatRequestsStore.loadInitial();
  }
  async loadMoreRequests() {
    return chatRequestsStore.loadMore();
  }

  toggleChatPin(chatId: string) {
    pinnedChatsStore.toggle(chatId);
    const chat = this.chatsMap.get(chatId);
    if (chat) {
      chat.isPinned = pinnedChatsStore.isPinned(chatId);
      this.sortChats(false);
    }
  }

  patchChatLocally(chatId: string, updates: Partial<Chat>, moveToTop = false) {
    const chat = this.chatsMap.get(chatId);
    if (!chat) return;

    const wasUnread = (chat.unreadCount ?? 0) > 0;
    Object.assign(chat, updates);
    const isUnread = (chat.unreadCount ?? 0) > 0;

    if (wasUnread !== isUnread) {
      this.unreadChatsCount += isUnread ? 1 : -1;
    }

    const lastUpdate = chat.lastMessage?.sentAt || chat.createdAt;
    chat._lastUpdateTs = new Date(lastUpdate).getTime();

    if (moveToTop || updates.lastMessage) {
      this.sortChats(false);
    }
  }

  public sortChats(verifyPins = true) {
    if (verifyPins) {
      this.chats.forEach((chat) => {
        chat.isPinned = pinnedChatsStore.isPinned(chat.id);
      });
    }

    this.chats.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b._lastUpdateTs || 0) - (a._lastUpdateTs || 0);
    });
  }

  removeChatLocally(chatId: string) {
    const chat = this.chatsMap.get(chatId);
    if (chat?.otherUser?.id) {
      const chatIds = this.userIdToChatIds.get(chat.otherUser.id);
      if (chatIds) {
        chatIds.delete(chatId);
        if (chatIds.size === 0) {
          this.userIdToChatIds.delete(chat.otherUser.id);
        }
      }
    }
    this.chats = this.chats.filter((c) => c.id !== chatId);
    this.chatsMap.delete(chatId);
  }

  public clear() {
    this.chats = [];
    this.chatsMap.clear();
    this.userIdToChatIds.clear();
    this.unreadChatsCount = 0;
    this.chatCursor = null;
    this.hasMoreChats = true;
    this.lastError = null;
    this.isLoadingChats = false;
    this.isLoadingMoreChats = false;
    this.cleanupSocketListeners();
  }
}

export const chatListStore = new ChatListStore();
