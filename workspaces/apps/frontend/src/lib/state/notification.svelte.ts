import type { NotificationDto, NotificationResponseDto } from "shared/types/notification.dto";

import { API_BASE } from "$lib/config";

class NotificationStore {
  notifications = $state<NotificationDto[]>([]);
  unreadCount = $state(0);
  loading = $state(false);
  hasMore = $state(true);
  private nextCursor: string | null = null;
  private readonly LIMIT = 15;

  async fetchNotifications(reset = false) {
    if (this.loading && !reset) return;
    this.loading = true;

    if (reset) {
      this.nextCursor = null;
      this.notifications = [];
    }

    try {
      const url = new URL(`${API_BASE}/notifications`, window.location.origin);
      url.searchParams.set("limit", this.LIMIT.toString());
      if (this.nextCursor) url.searchParams.set("cursor", this.nextCursor);

      const resp = await fetch(url.toString(), {
        credentials: "include",
      });

      if (!resp.ok) throw new Error("Failed to load notifications");

      const result = await resp.json();
      const { notifications, unreadCount, nextCursor, hasMore } = result.data as NotificationResponseDto;

      if (reset) {
        this.notifications = notifications;
      } else {
        this.notifications = [...this.notifications, ...notifications];
      }

      this.unreadCount = unreadCount;
      this.nextCursor = nextCursor;
      this.hasMore = hasMore;
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      this.loading = false;
    }
  }

  async markAsRead(id: string) {
    try {
      const resp = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PUT",
        credentials: "include",
      });

      if (resp.ok) {
        this.notifications = this.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n));
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  }

  async markAllAsRead() {
    try {
      const resp = await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PUT",
        credentials: "include",
      });

      if (resp.ok) {
        this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
        this.unreadCount = 0;
      }
    } catch (e) {
      console.error("Failed to mark all notifications as read:", e);
    }
  }

  addRealTimeNotification(notification: NotificationDto) {
    // Only add non-message notifications here (messages are handled by chatStore)
    if (notification.type === "new_message") return;

    // Avoid duplicates if socket and REST overlap
    if (this.notifications.some((n) => n._id === notification._id)) return;

    this.notifications = [notification, ...this.notifications];
    this.unreadCount += 1;
  }
}

export const notificationStore = new NotificationStore();
