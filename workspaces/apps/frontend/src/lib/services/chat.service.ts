import type { ChatListingResponseDto, MessageDto } from "shared/types/chat.dto";

import { API_BASE } from "$lib/config";
import { authStore } from "$state/auth.svelte";
import { ApiError } from "$utils/errors";

export class ChatService {
  /** Load messages for a chat via REST */
  async loadMessages(chatId: string, signal?: AbortSignal, markAsRead?: boolean): Promise<MessageDto[]> {
    const url = new URL(`${API_BASE}/chat/${chatId}/messages`, window.location.origin);
    url.searchParams.set("limit", "50");
    if (markAsRead) {
      url.searchParams.set("read", "true");
    }

    const resp = await fetch(url.toString(), {
      credentials: "include",
      signal,
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();
    const rawLoaded: any[] = result.data || result || [];
    return rawLoaded.map((m) => ({ ...m, id: m._id || m.id })) as MessageDto[];
  }

  /** Load older messages using cursor */
  async loadOlderMessages(chatId: string, oldestMessageId: string, signal?: AbortSignal): Promise<MessageDto[]> {
    const resp = await fetch(`${API_BASE}/chat/${chatId}/messages?limit=50&cursor=${oldestMessageId}`, {
      credentials: "include",
      signal,
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();
    const rawOlder: any[] = result.data || result || [];
    return rawOlder.map((m) => ({ ...m, id: m._id || m.id })) as MessageDto[];
  }

  /** Load chats list via REST */
  async fetchChats(
    query = "",
    limit = 20,
    cursor: string | null = null,
    signal?: AbortSignal,
  ): Promise<ChatListingResponseDto> {
    const url = new URL(
      query.trim().length > 0 ? `${API_BASE}/chat/search` : `${API_BASE}/chat`,
      window.location.origin,
    );

    if (query.trim().length > 0) {
      url.searchParams.set("q", query.trim());
    }
    url.searchParams.set("limit", limit.toString());
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const endpoint = url.toString();

    const resp = await fetch(endpoint, {
      credentials: "include",
      signal,
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();

    return result.data as ChatListingResponseDto;
  }

  /** Load pending chat requests via REST */
  async fetchRequests(limit = 20, cursor: string | null = null): Promise<ChatListingResponseDto> {
    const url = new URL(`${API_BASE}/chat/requests`, window.location.origin);
    url.searchParams.set("limit", limit.toString());
    if (cursor) url.searchParams.set("cursor", cursor);

    const resp = await fetch(url.toString(), {
      credentials: "include",
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();
    return result.data as ChatListingResponseDto;
  }

  /** Mark a chat as read via REST */
  async markChatRead(chatId: string) {
    const resp = await fetch(`${API_BASE}/chat/${chatId}/read`, {
      method: "PUT",
      headers: this.getHeaders(),
      credentials: "include",
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
  }

  /** Accept a chat request */
  async acceptChat(chatId: string) {
    const resp = await fetch(`${API_BASE}/chat/${chatId}/accept`, {
      method: "PUT",
      headers: this.getHeaders(),
      credentials: "include",
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    return await resp.json();
  }

  /** Reject a chat request */
  async rejectChat(chatId: string) {
    const resp = await fetch(`${API_BASE}/chat/${chatId}/reject`, {
      method: "PUT",
      headers: this.getHeaders(),
      credentials: "include",
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    return await resp.json();
  }

  /** Send a new chat request to a username */
  async sendChatRequest(username: string) {
    const resp = await fetch(`${API_BASE}/chat/request`, {
      method: "POST",
      headers: this.getHeaders(true),
      credentials: "include",
      body: JSON.stringify({ username: username.trim() }),
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    return await resp.json();
  }

  /** Helper to get headers with optional JSON content-type and auth token */
  private getHeaders(json = false): Record<string, string> {
    const headers: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }
    return headers;
  }
}

export const chatService = new ChatService();
