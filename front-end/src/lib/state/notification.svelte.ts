import { authStore } from "./auth.svelte";
import { API_BASE } from "../config";
import type { Notification, NotificationResponse } from "../types/notification";

class NotificationStore {
  notifications = $state<Notification[]>([]);
  unreadCount = $state(0);
  loading = $state(false);
  hasMore = $state(true);
  private skip = 0;
  private readonly LIMIT = 15;

  async fetchNotifications(reset = false) {
    if (this.loading && !reset) return;
    this.loading = true;

    if (reset) {
      this.skip = 0;
      this.notifications = [];
    }

    try {
      const resp = await fetch(`${API_BASE}/notifications?limit=${this.LIMIT}&skip=${this.skip}`, {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });

      if (!resp.ok) throw new Error("Failed to load notifications");

      const result = await resp.json();
      const { notifications, unreadCount } = result.data as NotificationResponse;

      if (reset) {
        this.notifications = notifications;
      } else {
        this.notifications = [...this.notifications, ...notifications];
      }

      this.unreadCount = unreadCount;
      this.skip += notifications.length;
      this.hasMore = notifications.length === this.LIMIT;
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
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });

      if (resp.ok) {
        this.notifications = this.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n,
        );
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
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
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

  addRealTimeNotification(notification: Notification) {
    // Only add non-message notifications here (messages are handled by chatStore)
    if (notification.type === "new_message") return;

    // Avoid duplicates if socket and REST overlap
    if (this.notifications.some((n) => n._id === notification._id)) return;

    this.notifications = [notification, ...this.notifications];
    this.unreadCount += 1;
  }
}

export const notificationStore = new NotificationStore();
