import { SvelteMap, SvelteSet } from "svelte/reactivity";

import type { IPresenceStore } from "./types";

export class PresenceStore implements IPresenceStore {
  onlineStatus = new SvelteMap<string, { isOnline: boolean; lastSeen: Date | null }>();
  typingStatus = new SvelteMap<string, SvelteSet<string>>();

  setOnline(userId: string, isOnline: boolean, lastSeen: Date | null = null) {
    this.onlineStatus.set(userId, { isOnline, lastSeen });
  }

  setTyping(chatId: string, userId: string, isTyping: boolean) {
    if (!this.typingStatus.has(chatId)) {
      this.typingStatus.set(chatId, new SvelteSet());
    }
    const typers = this.typingStatus.get(chatId);
    if (isTyping) {
      typers?.add(userId);
    } else {
      typers?.delete(userId);
    }
  }

  clear() {
    this.onlineStatus.clear();
    this.typingStatus.clear();
  }
}

export const presenceStore = new PresenceStore();
