import { authStore } from "$state/auth.svelte";
import type { AuthObserver } from "$state/auth-observer";

const browser = typeof window !== "undefined";
const PINNED_KEY = "chat_pinned_ids";

export class PinnedChatsStore implements AuthObserver {
  ids = $state(new Set<string>());

  constructor() {
    authStore.subscribe(this);
  }

  clear() {
    this.ids.clear();
  }

  init(userId: string) {
    if (browser) {
      this._load(userId);
    }
  }

  private _load(userId: string) {
    const saved = localStorage.getItem(`${PINNED_KEY}_${userId}`);
    this.ids.clear();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => this.ids.add(id));
        }
      } catch (e) {
        console.error("[PinnedChats] Failed to parse saved pins", e);
      }
    }
  }

  toggle(chatId: string) {
    if (this.ids.has(chatId)) {
      this.ids.delete(chatId);
    } else {
      this.ids.add(chatId);
    }
    this._save();
  }

  isPinned(chatId: string) {
    return this.ids.has(chatId);
  }

  private _save() {
    const userId = authStore.user?.id;
    if (browser && userId) {
      localStorage.setItem(`${PINNED_KEY}_${userId}`, JSON.stringify(Array.from(this.ids)));
    }
  }
}

export const pinnedChatsStore = new PinnedChatsStore();
