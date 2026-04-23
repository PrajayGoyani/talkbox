export type ChatStatus = "pending" | "accepted" | "rejected";

export interface User {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  plan?: string;
}

export interface Message {
  id: string; // Map from backend _id
  chatId: string;
  senderId: string;
  contentBody: string;
  createdAt: string;
  idempotencyKey?: string;
  reactions?: Array<{
    emoji: string;
    slug?: string;
    users: string[];
  }>;
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: string | null;
  isScrubbed?: boolean;
  emojiMetadata?: Record<string, string>;
}

export interface Chat {
  id: string;
  participants: string[];
  status: ChatStatus;
  createdBy: string;
  otherUser: User;
  unreadCount?: number;
  lastMessage?: {
    contentBody: string;
    senderId: string;
    sentAt: string;
  };
  createdAt: string;
}

export interface MessageAlert {
  chatId: string;
  senderId: string;
  senderName?: string | null;
  senderUsername: string;
  senderAvatar?: string | null;
  preview: string;
}
