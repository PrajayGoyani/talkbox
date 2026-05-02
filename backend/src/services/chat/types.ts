import { IChat } from "@models/chat.model";
import { ChatListingResponseDto, MessageDto } from "@shared/types/chat.dto";
import { ObjectId } from "mongodb";

export interface IChatListingService {
  getChatListing(userId: string | ObjectId, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto>;
  getChatRequests(userId: string | ObjectId, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto>;
  searchChats(
    userId: string | ObjectId,
    query: string,
    limit?: number,
    cursor?: string | null,
  ): Promise<ChatListingResponseDto>;
}

export interface IChatActionService {
  requestChat(senderId: string | ObjectId, targetUsername: string): Promise<IChat>;
  acceptChat(chatId: string, userId: string): Promise<IChat>;
  rejectChat(chatId: string | ObjectId, userId: string | ObjectId): Promise<IChat>;
  deleteChat(chatId: string | ObjectId, userId: string | ObjectId): Promise<{ message: string }>;
}

export interface IMessageService {
  getChatMessages(
    chatId: string | ObjectId,
    userId: string,
    limit?: number,
    cursor?: string | null,
    plan?: "free" | "pro",
  ): Promise<MessageDto[]>;
  markChatRead(chatId: string | ObjectId, userId: string | ObjectId): Promise<{ message: string }>;
}
