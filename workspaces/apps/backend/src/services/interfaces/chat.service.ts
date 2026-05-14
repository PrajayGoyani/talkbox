import { ChatDto, ChatListingResponseDto, MessageDto } from "shared/types/chat.dto";

export interface IChatService {
  getChatListing(userId: string, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto>;
  getChatRequests(userId: string, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto>;
  searchChats(
    userId: string,
    query: string,
    limit?: number,
    cursor?: string | null,
  ): Promise<ChatListingResponseDto>;
  getChat(userId: string, chatId: string): Promise<ChatDto>;
  requestChat(senderId: string, targetUsername: string): Promise<any>;
  acceptChat(chatId: string, userId: string): Promise<any>;
  rejectChat(chatId: string, userId: string): Promise<any>;
  deleteChat(chatId: string, userId: string): Promise<{ message: string }>;
  getChatMessages(
    chatId: string,
    userId: string,
    limit?: number,
    cursor?: string | null,
    plan?: "free" | "pro",
    markAsRead?: boolean,
  ): Promise<MessageDto[]>;
  markChatRead(chatId: string, userId: string): Promise<{ message: string }>;
}
