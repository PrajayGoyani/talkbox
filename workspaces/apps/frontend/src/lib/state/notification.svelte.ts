import type { NotificationDto, NotificationResponseDto } from "shared/types/notification.dto";

import { api } from "$lib/services/api.client";

import type { AuthObserver } from "./auth-observer";

import { authStore } from "./auth.svelte";

class NotificationStore implements AuthObserver {
  notifications = $state<NotificationDto[]>([]);
  unreadCount = $state(0);
  loading = $state(false);
  hasMore = $state(true);
  private nextCursor: string | null = null;
  private readonly LIMIT = 15;

  constructor() {
    authStore.subscribe(this);
  }

  init(_userId: string) {
    void this.fetchNotifications(true);
  }

  clear() {
    this.notifications = [];
    this.unreadCount = 0;
    this.loading = false;
    this.hasMore = true;
    this.nextCursor = null;
  }

  async fetchNotifications(reset = false) {
    if (this.loading) return;
    this.loading = true;

    if (reset) {
      this.nextCursor = null;
      this.notifications = [];
    }

    try {
      const data = await api.get<NotificationResponseDto>("/notifications", {
        params: {
          limit: this.LIMIT,
          cursor: this.nextCursor,
        },
      });

      const { notifications, unreadCount, nextCursor, hasMore } = data;

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
      await api.put(`/notifications/${id}/read`);
      this.notifications = this.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n));
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  }

  async markAllAsRead() {
    try {
      await api.put("/notifications/read-all");
      this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
      this.unreadCount = 0;
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
