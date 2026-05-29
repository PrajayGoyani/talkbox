import { IChatService } from "@services/interfaces/chat.service";
import { ChatDto, ChatListingResponseDto, MessageDto } from "shared/types/chat.dto";

import { IChatListingService, IChatActionService, IMessageService } from "./types";

/**
 * Facade for Chat-related services.
 * Maintains the original API for backward compatibility while delegating
 * core logic to specialized domain services.
 */
export class ChatService implements IChatService {
  constructor(
    private chatListingService: IChatListingService,
    private chatActionService: IChatActionService,
    private messageService: IMessageService,
  ) {}
  // --- Listings ---
  async getChatListing(userId: string, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto> {
    return this.chatListingService.getChatListing(userId, limit, cursor);
  }

  async getChatRequests(userId: string, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto> {
    return this.chatListingService.getChatRequests(userId, limit, cursor);
  }

  async searchChats(
    userId: string,
    query: string,
    limit?: number,
    cursor?: string | null,
  ): Promise<ChatListingResponseDto> {
    return this.chatListingService.searchChats(userId, query, limit, cursor);
  }

  async getChat(userId: string, chatId: string): Promise<ChatDto> {
    return this.chatListingService.getChat(userId, chatId);
  }

  // --- Actions ---
  async requestChat(senderId: string, targetUsername: string): Promise<any> {
    return this.chatActionService.requestChat(senderId, targetUsername);
  }

  async acceptChat(chatId: string, userId: string): Promise<any> {
    return this.chatActionService.acceptChat(chatId, userId);
  }

  async rejectChat(chatId: string, userId: string): Promise<any> {
    return this.chatActionService.rejectChat(chatId, userId);
  }

  async deleteChat(chatId: string, userId: string): Promise<{ message: string }> {
    return this.chatActionService.deleteChat(chatId, userId);
  }

  // --- Messages ---
  async getChatMessages(
    chatId: string,
    userId: string,
    limit?: number,
    cursor?: string | null,
    plan?: "free" | "pro",
    markAsRead?: boolean,
  ): Promise<MessageDto[]> {
    return this.messageService.getChatMessages(chatId, userId, limit, cursor, plan, markAsRead);
  }

  async markChatRead(chatId: string, userId: string): Promise<{ message: string }> {
    return this.messageService.markChatRead(chatId, userId);
  }

  async updateRetentionPeriod(chatId: string, userId: string, retentionPeriod: number | null): Promise<ChatDto> {
    await this.chatActionService.updateRetentionPeriod(chatId, userId, retentionPeriod);
    return this.getChat(userId, chatId);
  }
}
