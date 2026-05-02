import { ChatListingResponseDto, MessageDto } from "@shared/types/chat.dto";

import { chatActionService } from "./chat/chat-action.service";
import { chatListingService } from "./chat/chat-listing.service";
import { messageService } from "./chat/message.service";

/**
 * Facade for Chat-related services.
 * Maintains the original API for backward compatibility while delegating
 * core logic to specialized domain services.
 */
class ChatService {
  // --- Listings ---
  async getChatListing(userId: string, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto> {
    return chatListingService.getChatListing(userId, limit, cursor);
  }

  async getChatRequests(userId: string, limit?: number, cursor?: string | null): Promise<ChatListingResponseDto> {
    return chatListingService.getChatRequests(userId, limit, cursor);
  }

  async searchChats(
    userId: string,
    query: string,
    limit?: number,
    cursor?: string | null,
  ): Promise<ChatListingResponseDto> {
    return chatListingService.searchChats(userId, query, limit, cursor);
  }

  // --- Actions ---
  async requestChat(senderId: string, targetUsername: string): Promise<any> {
    return chatActionService.requestChat(senderId, targetUsername);
  }

  async acceptChat(chatId: string, userId: string): Promise<any> {
    return chatActionService.acceptChat(chatId, userId);
  }

  async rejectChat(chatId: string, userId: string): Promise<any> {
    return chatActionService.rejectChat(chatId, userId);
  }

  async deleteChat(chatId: string, userId: string): Promise<{ message: string }> {
    return chatActionService.deleteChat(chatId, userId);
  }

  // --- Messages ---
  async getChatMessages(
    chatId: string,
    userId: string,
    limit?: number,
    cursor?: string | null,
    plan?: "free" | "pro",
  ): Promise<MessageDto[]> {
    return messageService.getChatMessages(chatId, userId, limit, cursor, plan);
  }

  async markChatRead(chatId: string, userId: string): Promise<{ message: string }> {
    return messageService.markChatRead(chatId, userId);
  }
}

export const chatService = new ChatService();
