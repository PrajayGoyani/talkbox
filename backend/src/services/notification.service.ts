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

import type { NotificationResponseDto } from "@root/shared/types/notification.dto";

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

  async getByUser(
    userId: string | ObjectId,
    { limit = 15, cursor = null }: { limit?: number; cursor?: string | null } = {},
  ): Promise<NotificationResponseDto> {
    const query: any = { recipientId: userId };

    if (cursor) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const notifications = await Notification.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("senderId", "username email avatar_url")
      .lean();

    const hasMore = notifications.length > limit;
    if (hasMore) {
      notifications.pop();
    }

    const nextCursor = hasMore ? notifications[notifications.length - 1]._id.toString() : null;

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return { notifications: notifications as any, unreadCount, nextCursor, hasMore };
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
