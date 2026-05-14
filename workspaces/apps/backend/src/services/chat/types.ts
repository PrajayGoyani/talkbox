import { IChat } from "@models/chat.model";
import { ObjectId } from "mongodb";
import { ChatListingResponseDto, MessageDto } from "shared/types/chat.dto";

export interface IChatListingService {
  getChatListing(userId: string | ObjectId, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto>;
  getChatRequests(userId: string | ObjectId, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto>;
  searchChats(
    userId: string | ObjectId,
    query: string,
    limit?: number,
    cursor?: string | null,
  ): Promise<ChatListingResponseDto>;
  getChat(userId: string | ObjectId, chatId: string | ObjectId): Promise<any>;
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
    markAsRead?: boolean,
  ): Promise<MessageDto[]>;
  markChatRead(chatId: string | ObjectId, userId: string | ObjectId): Promise<{ message: string }>;
  saveAndDeliver(
    sender: any,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
  ): Promise<MessageDto>;
  deleteMessage(sender: any, messageId: string): Promise<void>;
  editMessage(sender: any, messageId: string, contentBody: string): Promise<void>;
  invalidateCache(chatId: string): void;
  ensureParticipant(chatId: string, userId: string): Promise<Set<string>>;
}

export interface IChatLockdownService {
  lockdownChat(chatId: string | ObjectId): Promise<void>;
  isChatDeleted(chatId: string | ObjectId): Promise<boolean>;
  unlockChat(chatId: string | ObjectId): Promise<void>;
}
