import { NotificationRepository, notificationRepository } from "@repositories/notification.repository";
import { AppError } from "@utils/AppError";
import { ObjectId } from "mongodb";
import { INotification } from "@models/notification.model";

interface CreateNotificationDto {
  recipientId: string | ObjectId;
  senderId: string | ObjectId;
  type: INotification["type"];
  referenceId: string | ObjectId;
  message: string;
}

import type { NotificationResponseDto } from "@root/shared/types/notification.dto";

class NotificationService {
  constructor(private repository: NotificationRepository) {}

  /**
   * Create and persist a notification.
   * Returns the populated notification document.
   */
  async create(dto: CreateNotificationDto) {
    return this.repository.create({
      recipientId: dto.recipientId,
      senderId: dto.senderId,
      type: dto.type,
      referenceId: dto.referenceId,
      message: dto.message,
    });
  }

  async getByUser(
    userId: string | ObjectId,
    { limit = 15, cursor = null }: { limit?: number; cursor?: string | null } = {},
  ): Promise<NotificationResponseDto> {
    const notifications = await this.repository.findByUser(userId, limit + 1, cursor);

    const hasMore = notifications.length > limit;
    const results = hasMore ? notifications.slice(0, limit) : notifications;

    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    const unreadCount = await this.repository.countUnread(userId);
    
    const mapped = results.map((n) => this.repository.transformNotification(n));

    return { notifications: mapped, unreadCount, nextCursor, hasMore };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string | ObjectId, userId: string | ObjectId) {
    const notification = await this.repository.markAsRead(notificationId, userId);
    if (!notification) {
      throw AppError.notFound("Notification not found", "NOTIFICATION_NOT_FOUND");
    }
    return notification;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string | ObjectId) {
    await this.repository.markAllAsRead(userId);
    return { message: "All notifications marked as read" };
  }
}

export const notificationService = new NotificationService(notificationRepository);
