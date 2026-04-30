import type { MessageAlertDto } from "@root/shared/types/chat.dto";

import { ASSETS } from "$lib/config";
import { playNotificationSound } from "$utils/audio";
import { messageStore } from "$state/active-chat.svelte";

export class NotificationService {
  /**
   * Primary entry point for alerting the user of a new message or event.
   * Handles both audio and visual notifications based on context.
   */
  notify(data: MessageAlertDto) {
    // 1. Play sound if it's not the currently selected chat OR if the window isn't focused
    const isSelected = data.chatId === messageStore.activeChatId;
    const isFocused = typeof document !== "undefined" && document.hasFocus();

    if (!isSelected || !isFocused) {
      playNotificationSound();
    }

    // 2. Show browser notification if tab is hidden
    if (typeof document !== "undefined" && !document.hasFocus()) {
      this.showBrowserNotification(data);
    }
  }

  /**
   * Specifically triggers a browser notification.
   */
  showBrowserNotification(data: MessageAlertDto) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

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

  /**
   * Request permission for browser notifications.
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    return await Notification.requestPermission();
  }
}

export const notificationService = new NotificationService();
