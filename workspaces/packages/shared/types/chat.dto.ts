/**
 * Reaction group data.
 */
export interface ReactionGroupDto {
  emoji: string;
  slug?: string;
  users: string[];
}

/**
 * Granular reaction action.
 */
export interface ReactionActionDto {
  action: "added" | "removed";
  emoji: string;
  slug: string;
  userId: string;
}

/**
 * Reaction update payload for socket events.
 */
export interface MessageReactionUpdateDto {
  messageId: string;
  chatId: string;
  reactions?: ReactionGroupDto[];
  reaction?: ReactionActionDto;
}

/**
 * Typing indicator data.
 */
export interface TypingIndicatorDto {
  chatId: string;
  userId: string;
}

/**
 * User presence data.
 */
export interface UserStatusDto {
  userId: string;
  isOnline: boolean;
  lastSeen: string | Date | null;
}

/**
 * Interface for Message Data Transfer Object.
 */
export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  contentBody: string;
  idempotencyKey?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  isEdited?: boolean;
  editedAt?: string | Date | null;
  isDeleted?: boolean;
  deletedAt?: string | Date | null;
  attachment?: {
    kind: "image" | "audio" | "video" | null;
    url: string | null;
  };
  emojiMetadata?: Record<string, string>;
  isScrubbed?: boolean;
  reactions?: ReactionGroupDto[];
  senderName?: string | null;
  senderUsername?: string;
  senderAvatar?: string | null;
}

/**
 * Socket acknowledgement response.
 */
export interface MessageAckDto {
  status: "ok" | "error";
  message?: MessageDto;
  error?: string;
}

/**
 * Minimal user data for chat partners in listings.
 */
export interface ChatPartnerDto {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string;
  plan: "free" | "pro";
  bio?: string | null;
}

/**
 * Data Transfer Object for Chat.
 */
export interface ChatDto {
  id: string;
  status: "pending" | "accepted" | "rejected";
  isGroup: boolean;
  createdBy: string;
  otherUser?: ChatPartnerDto | null;
  lastMessage: {
    contentBody: string;
    senderId: string | null;
    sentAt: string | Date | null;
  } | null;
  unreadCount: number;
  createdAt: string | Date;
  retentionPeriod?: number | null;
}

/**
 * Standard response for paginated chat listings.
 */
export interface ChatListingResponseDto {
  data: ChatDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Payload for accepting a chat.
 */
export interface AcceptChatRequestDto {
  chatId: string;
}

/**
 * Payload for rejecting a chat.
 */
export interface RejectChatRequestDto {
  chatId: string;
}

/**
 * Message alert for real-time notifications.
 */
export interface MessageAlertDto {
  chatId: string;
  senderId: string;
  senderName?: string | null;
  senderUsername: string;
  senderAvatar?: string | null;
  preview: string;
  type?: "new_message" | "chat_request";
}
/**
 * Profile update event data.
 */
export interface ProfileUpdateDto {
  userId: string;
  name?: string | null;
  avatarUrl?: string;
  bio?: string | null;
  plan?: "free" | "pro";
}
