/**
 * Data Transfer Object for Chat.
 * Represent's the standardized chat object sent to the frontend.
 */
export interface ChatDto {
  id: string;
  status: "pending" | "accepted" | "rejected";
  isGroup: boolean;
  createdBy: string;
  otherUser?: {
    id: string;
    username: string;
    name: string | null;
    email: string;
    avatarUrl: string;
    plan: "free" | "pro";
    bio?: string | null;
  } | null;
  lastMessage: {
    contentBody: string;
    senderId: string | null;
    sentAt: Date | null;
  } | null;
  unreadCount: number;
  createdAt: Date;
  participants: string[];
}

/**
 * Standard response for paginated chat listings.
 */
export interface ChatListingResponse {
  data: ChatDto[];
  nextCursor: string | null;
  hasMore: boolean;
}
