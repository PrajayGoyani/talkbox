import type { ChatDto, ChatListingResponseDto, MessageDto } from "shared/types/chat.dto";

import { api } from "./api.client";

export class ChatService {
  /** Load messages for a chat via REST */
  async loadMessages(chatId: string, signal?: AbortSignal, markAsRead?: boolean): Promise<MessageDto[]> {
    const rawLoaded = await api.get<any[]>(`/chat/${chatId}/messages`, {
      params: { limit: 50, read: markAsRead ? "true" : undefined },
      signal,
    });

    return rawLoaded.map((m) => ({ ...m, id: m._id || m.id })) as MessageDto[];
  }

  /** Load older messages using cursor */
  async loadOlderMessages(chatId: string, oldestMessageId: string, signal?: AbortSignal): Promise<MessageDto[]> {
    const rawOlder = await api.get<any[]>(`/chat/${chatId}/messages`, {
      params: { limit: 50, cursor: oldestMessageId },
      signal,
    });

    return rawOlder.map((m) => ({ ...m, id: m._id || m.id })) as MessageDto[];
  }

  /** Load single chat by ID */
  async fetchChat(chatId: string, signal?: AbortSignal): Promise<ChatDto> {
    return api.get<ChatDto>(`/chat/${chatId}`, { signal });
  }

  /** Load chats list via REST */
  async fetchChats(
    query = "",
    limit = 20,
    cursor: string | null = null,
    signal?: AbortSignal,
  ): Promise<ChatListingResponseDto> {
    const path = query.trim().length > 0 ? "/chat/search" : "/chat";
    return api.get<ChatListingResponseDto>(path, {
      params: {
        q: query.trim() || undefined,
        limit,
        cursor,
      },
      signal,
    });
  }

  /** Load pending chat requests via REST */
  async fetchRequests(limit = 20, cursor: string | null = null): Promise<ChatListingResponseDto> {
    return api.get<ChatListingResponseDto>("/chat/requests", {
      params: { limit, cursor },
    });
  }

  /** Mark a chat as read via REST */
  async markChatRead(chatId: string) {
    return api.put(`/chat/${chatId}/read`);
  }

  /** Accept a chat request */
  async acceptChat(chatId: string) {
    return api.put(`/chat/${chatId}/accept`);
  }

  /** Reject a chat request */
  async rejectChat(chatId: string) {
    return api.put(`/chat/${chatId}/reject`);
  }

  /** Send a new chat request to a username */
  async sendChatRequest(username: string) {
    return api.post("/chat/request", { username: username.trim() });
  }
}

export const chatService = new ChatService();
