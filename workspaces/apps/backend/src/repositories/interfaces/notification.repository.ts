import { ObjectId } from "mongodb";
import { NotificationDto } from "shared/types/notification.dto";

export interface INotificationRepository {
  create(data: {
    recipientId: string | ObjectId;
    senderId: string | ObjectId;
    type: "chat_request" | "request_accepted" | "request_rejected" | "new_message";
    referenceId: string | ObjectId;
    message: string;
  }): Promise<any>;
  findByUser(userId: string | ObjectId, limit: number, cursor?: string | null): Promise<any[]>;
  countUnread(userId: string | ObjectId): Promise<number>;
  markAsRead(notificationId: string | ObjectId, userId: string | ObjectId): Promise<any>;
  markAllAsRead(userId: string | ObjectId): Promise<any>;
  transformNotification(n: any): NotificationDto;
}
