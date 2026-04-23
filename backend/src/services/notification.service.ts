import Notification, { INotification } from "@models/notification.model";
import { AppError } from "@utils/AppError";
import { ObjectId } from "mongodb";

interface CreateNotificationDto {
  recipientId: string | ObjectId;
  senderId: string | ObjectId;
  type: INotification["type"];
  referenceId: string | ObjectId;
  message: string;
}

interface NotificationListResult {
  notifications: INotification[];
  unreadCount: number;
}

class NotificationService {
  /**
   * Create and persist a notification.
   * Returns the populated notification document.
   */
  async create(dto: CreateNotificationDto) {
    const notification = await Notification.create({
      recipientId: dto.recipientId,
      senderId: dto.senderId,
      type: dto.type,
      referenceId: dto.referenceId,
      message: dto.message,
    });

    return notification.populate("senderId", "username email avatar_url");
  }

  /**
   * Get paginated notifications for a user.
   * Defaults: limit 15, skip 0, sorted newest first.
   */
  async getByUser(
    userId: string | ObjectId,
    { limit = 15, skip = 0 }: { limit?: number; skip?: number } = {},
  ): Promise<NotificationListResult> {
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
  async markAsRead(notificationId: string | ObjectId, userId: string | ObjectId) {
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
  async markAllAsRead(userId: string | ObjectId) {
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    return { message: "All notifications marked as read" };
  }
}

export const notificationService = new NotificationService();
