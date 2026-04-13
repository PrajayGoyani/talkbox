import Notification from "../models/notification.model";
import { AppError } from "../utils/AppError";

class NotificationService {
  /**
   * Create and persist a notification.
   * Returns the populated notification document.
   */
  async create({ recipientId, senderId, type, referenceId, message }) {
    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      referenceId,
      message,
    });

    return notification.populate("senderId", "username email avatar_url");
  }

  /**
   * Get paginated notifications for a user.
   * Defaults: limit 15, skip 0, sorted newest first.
   */
  async getByUser(userId, { limit = 15, skip = 0 } = {}) {
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "username email avatar_url")
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { returnDocument: "after" },
    );
    if (!notification) {
      throw AppError.notFound("Notification not found", "NOTIFICATION_NOT_FOUND");
    }
    return notification;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    return { message: "All notifications marked as read" };
  }
}

export const notificationService = new NotificationService();
