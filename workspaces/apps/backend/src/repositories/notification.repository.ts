import Notification, { INotificationModel } from "@models/notification.model";
import { ObjectId } from "mongodb";
import { NotificationDto } from "shared/types/notification.dto";

import { INotificationRepository } from "./interfaces/notification.repository";

export class NotificationRepository implements INotificationRepository {
  constructor(public notificationModel: INotificationModel) {}

  public async create(data: {
    recipientId: string | ObjectId;
    senderId: string | ObjectId;
    type: "chat_request" | "request_accepted" | "request_rejected" | "new_message";
    referenceId: string | ObjectId;
    message: string;
  }) {
    const notification = await this.notificationModel.create(data);
    return (notification as any).populate("senderId", "username avatar_url");
  }

  public async findByUser(userId: string | ObjectId, limit: number, cursor?: string | null) {
    const query: Record<string, any> = { recipientId: new ObjectId(userId) };
    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    return this.notificationModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate("senderId", "username avatar_url")
      .lean();
  }

  public async countUnread(userId: string | ObjectId) {
    return this.notificationModel.countDocuments({
      recipientId: new ObjectId(userId),
      isRead: false,
    });
  }

  public async markAsRead(notificationId: string | ObjectId, userId: string | ObjectId) {
    return this.notificationModel.findOneAndUpdate(
      { _id: new ObjectId(notificationId), recipientId: new ObjectId(userId) },
      { isRead: true },
      { returnDocument: "after" },
    );
  }

  public async markAllAsRead(userId: string | ObjectId) {
    return this.notificationModel.updateMany({ recipientId: new ObjectId(userId), isRead: false }, { isRead: true });
  }

  public transformNotification(n: any): NotificationDto {
    return {
      _id: n._id.toString(),
      recipientId: n.recipientId.toString(),
      senderId: n.senderId as unknown as NotificationDto["senderId"],
      type: n.type,
      referenceId: n.referenceId.toString(),
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  }
}
export const notificationRepository = {};
