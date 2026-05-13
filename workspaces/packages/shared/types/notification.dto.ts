export type NotificationType = "chat_request" | "request_accepted" | "request_rejected" | "new_message";

/**
 * Notification Data Transfer Object.
 */
export interface NotificationDto {
  _id: string;
  recipientId: string;
  senderId: {
    _id: string;
    username: string;
    avatar_url: string;
  };
  type: NotificationType;
  referenceId: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
}

/**
 * Standard response for paginated notification listings.
 */
export interface NotificationResponseDto {
  notifications: NotificationDto[];
  unreadCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}
