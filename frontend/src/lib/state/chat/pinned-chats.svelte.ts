const browser = typeof window !== "undefined";

const PINNED_KEY = "chat_pinned_ids";

export class PinnedChatsStore {
  ids = $state<string[]>([]);

  constructor() {
    if (browser) {
      const saved = localStorage.getItem(PINNED_KEY);
      if (saved) {
        try {
          this.ids = JSON.parse(saved);
        } catch (e) {
          console.error("[PinnedChats] Failed to parse saved pins", e);
        }
      }
    }
  }

  toggle(chatId: string) {
    if (this.ids.includes(chatId)) {
      this.ids = this.ids.filter((id) => id !== chatId);
    } else {
      this.ids = [...this.ids, chatId];
    }
    this._save();
  }

  isPinned(chatId: string) {
    return this.ids.includes(chatId);
  }

  private _save() {
    if (browser) {
      localStorage.setItem(PINNED_KEY, JSON.stringify(this.ids));
    }
  }
}

export const pinnedChatsStore = new PinnedChatsStore();
