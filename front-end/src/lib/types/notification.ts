export type NotificationType =
  | "chat_request"
  | "request_accepted"
  | "request_rejected"
  | "new_message";

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  message: string;
  referenceId: string; // chatId or requestId
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}
