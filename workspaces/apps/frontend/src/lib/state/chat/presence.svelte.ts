import { realtimeEvents, RealtimeEvent } from "$services/realtime-events";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import type { IPresenceStore } from "./types";

export class PresenceStore implements IPresenceStore {
  onlineStatus = new SvelteMap<string, { isOnline: boolean; lastSeen: Date | null }>();
  typingStatus = new SvelteMap<string, SvelteSet<string>>();

  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    realtimeEvents.on(RealtimeEvent.USER_STATUS_UPDATED, (data) => {
      this.setOnline(data.userId, data.isOnline, data.lastSeen ? new Date(data.lastSeen) : null);
    });

    realtimeEvents.on(RealtimeEvent.USER_STATUS_BATCH, (batch: any[]) => {
      batch.forEach((data) => {
        this.setOnline(data.userId, data.isOnline, data.lastSeen ? new Date(data.lastSeen) : null);
      });
    });

    realtimeEvents.on(RealtimeEvent.TYPING_STARTED, (data) => {
      this.setTyping(data.chatId, data.userId, true);
      const key = `${data.chatId}-${data.userId}`;
      if (this.typingTimeouts.has(key)) clearTimeout(this.typingTimeouts.get(key));

      this.typingTimeouts.set(
        key,
        setTimeout(() => {
          this.setTyping(data.chatId, data.userId, false);
          this.typingTimeouts.delete(key);
        }, 5000), // TYPING_INDICATOR_DURATION from config
      );
    });

    realtimeEvents.on(RealtimeEvent.TYPING_STOPPED, (data) => {
      this.setTyping(data.chatId, data.userId, false);
      const key = `${data.chatId}-${data.userId}`;
      if (this.typingTimeouts.has(key)) {
        clearTimeout(this.typingTimeouts.get(key));
        this.typingTimeouts.delete(key);
      }
    });
  }

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
    this.typingTimeouts.forEach(clearTimeout);
    this.typingTimeouts.clear();
  }
}

export const presenceStore = new PresenceStore();
