import { authStore } from "$state/auth.svelte";

const browser = typeof window !== "undefined";
const PINNED_KEY = "chat_pinned_ids";

export class PinnedChatsStore {
  ids = $state(new Set<string>());

  constructor() {
    if (browser) {
      // Automatically load pins when user changes
      $effect.root(() => {
        $effect(() => {
          const userId = authStore.user?.id;
          if (userId) {
            this._load(userId);
          } else {
            this.ids.clear();
          }
        });
      });
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
