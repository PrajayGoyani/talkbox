import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  type: "chat_request" | "request_accepted" | "request_rejected" | "new_message";
  referenceId: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface INotificationModel extends mongoose.Model<INotification> {}

const notificationSchema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  senderId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  type: {
    type: String,
    enum: ["chat_request", "request_accepted", "request_rejected", "new_message"],
    required: true,
  },
  referenceId: { type: Schema.Types.ObjectId, required: true },
  message: { type: String, default: "" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Fast pagination query: unread notifications for a user, newest first
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

const Notification = mongoose.model<INotification, INotificationModel>("Notification", notificationSchema);

export default Notification;
