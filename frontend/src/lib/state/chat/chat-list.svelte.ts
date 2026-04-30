import type { Chat } from "$lib/types/chat";

import { chatService } from "$services/chat.service";
import { authStore } from "$state/auth.svelte";
import { ApiError } from "$utils/errors";

import type { IChatListStore } from "./types";

export class ChatListStore implements IChatListStore {
  chats: Array<Chat> = $state([]);
  hasMoreChats = $state(true);
  chatCursor: string | null = $state(null);
  isLoadingMoreChats = $state(false);

  requests: Array<Chat> = $state([]);
  hasMoreRequests = $state(true);
  requestCursor: string | null = $state(null);
  isLoadingMoreRequests = $state(false);

  pendingRequestCount = $state(0);
  unreadChatsCount = $state(0);
  currentSearchQuery = $state("");
  lastError: string | null = $state(null);

  private pinnedChatIds: Set<string> = new Set();
  public chatsMap: Map<string, Chat> = new Map();
  private chatsAbortController: AbortController | null = null;

  constructor() {
    if (typeof window !== "undefined") {
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
    this.lastError = null;
    try {
      const result = await chatService.fetchRequests(20, null);
      this.requests = result.data;
      this.hasMoreRequests = result.hasMore;
      this.requestCursor = result.nextCursor;
      return this.requests;
    } catch (e: any) {
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
    this.sortChats(false);
  }

  patchChatLocally(chatId: string, updates: Partial<Chat>, moveToTop = false) {
    const chat = this.chatsMap.get(chatId);
    if (!chat) return;

    const chatIndex = this.chats.findIndex((c) => c.id === chatId);
    const wasUnread = (chat.unreadCount ?? 0) > 0;
    Object.assign(chat, updates);
    const isUnread = (chat.unreadCount ?? 0) > 0;

    if (wasUnread !== isUnread) {
      this.unreadChatsCount += isUnread ? 1 : -1;
    }

    const lastUpdate = chat.lastMessage?.sentAt || chat.createdAt;
    chat._lastUpdateTs = new Date(lastUpdate).getTime();

    if (moveToTop && chatIndex > 0) {
      this.chats.splice(chatIndex, 1);
      this.chats.unshift(chat);
      this.sortChats(false);
    } else if (moveToTop || updates.lastMessage) {
      this.sortChats(false);
    }
  }

  private loadPinnedChats() {
    if (!authStore.user?.id) return;
    try {
      const saved = localStorage.getItem(`pinned_chats_${authStore.user.id}`);
      this.pinnedChatIds = saved ? new Set(JSON.parse(saved)) : new Set();
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

  public sortChats(verifyPins = true) {
    if (verifyPins) {
      this.chats.forEach((chat: Chat) => {
        chat.isPinned = this.pinnedChatIds.has(chat.id);
        if (!chat._lastUpdateTs) {
          chat._lastUpdateTs = new Date(chat.lastMessage?.sentAt || chat.createdAt).getTime();
        }
      });
    }

    this.chats.sort((a: Chat, b: Chat) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (b._lastUpdateTs || 0) - (a._lastUpdateTs || 0);
    });

    this.chats = this.chats;
  }
}

export const chatListStore = new ChatListStore();
