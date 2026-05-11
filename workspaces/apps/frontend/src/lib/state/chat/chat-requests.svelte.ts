import type { ChatDto } from "$lib/types/chat";

import { chatService } from "$lib/services/chat.service";
import { authStore } from "$state/auth.svelte";

export class ChatRequestsStore {
  items = $state<ChatDto[]>([]);
  hasMore = $state(true);
  isLoading = $state(false);
  cursor = $state<string | null>(null);

  constructor() {
    if (typeof window !== "undefined") {
      $effect.root(() => {
        $effect(() => {
          if (!authStore.user?.id) {
            this.clear();
          }
        });
      });
    }
  }

  async loadInitial() {
    this.isLoading = true;
    try {
      const response = await chatService.fetchRequests();
      this.items = response.data;
      this.cursor = response.nextCursor;
      this.hasMore = response.hasMore;
    } catch (e) {
      console.error("[ChatRequests] Load failed", e);
    } finally {
      this.isLoading = false;
    }
  }
  // ... rest of the file

  async loadMore() {
    if (!this.hasMore || this.isLoading) return;
    this.isLoading = true;
    try {
      const response = await chatService.fetchRequests(20, this.cursor);
      this.items = [...this.items, ...response.data];
      this.cursor = response.nextCursor;
      this.hasMore = response.hasMore;
    } finally {
      this.isLoading = false;
    }
  }

  add(chat: ChatDto) {
    if (!this.items.some((i) => i.id === chat.id)) {
      this.items = [chat, ...this.items];
    }
  }

  remove(chatId: string) {
    this.items = this.items.filter((i) => i.id !== chatId);
  }

  clear() {
    this.items = [];
    this.cursor = null;
    this.hasMore = true;
  }
}

export const chatRequestsStore = new ChatRequestsStore();
