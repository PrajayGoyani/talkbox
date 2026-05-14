import { ObjectId } from "mongodb";
import { NotificationResponseDto } from "shared/types/notification.dto";

export interface INotificationService {
  create(dto: any): Promise<any>;
  getByUser(
    userId: string | ObjectId,
    options?: { limit?: number; cursor?: string | null },
  ): Promise<NotificationResponseDto>;
  markAsRead(notificationId: string | ObjectId, userId: string | ObjectId): Promise<any>;
  markAllAsRead(userId: string | ObjectId): Promise<{ message: string }>;
}
