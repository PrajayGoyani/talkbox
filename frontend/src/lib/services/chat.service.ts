import type { Chat, Message } from "$types/chat";

import { API_BASE } from "$lib/config";
import { authStore } from "$state/auth.svelte";
import { ApiError } from "$utils/errors";

export class ChatService {
  /** Load messages for a chat via REST */
  async loadMessages(chatId: string, signal?: AbortSignal) {
    const resp = await fetch(`${API_BASE}/chat/${chatId}/messages?limit=50`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      credentials: "include",
      signal,
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();
    const rawLoaded: any[] = result.data || result || [];
    return rawLoaded.map((m) => ({ ...m, id: m._id || m.id })) as Message[];
  }

  /** Load older messages using cursor */
  async loadOlderMessages(chatId: string, oldestMessageId: string, signal?: AbortSignal) {
    const resp = await fetch(`${API_BASE}/chat/${chatId}/messages?limit=50&cursor=${oldestMessageId}`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      credentials: "include",
      signal,
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();
    const rawOlder: any[] = result.data || result || [];
    return rawOlder.map((m) => ({ ...m, id: m._id || m.id })) as Message[];
  }

  /** Load chats list via REST */
  async fetchChats(query = "", limit = 20, cursor: string | null = null, signal?: AbortSignal) {
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      credentials: "include",
      signal,
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();

    return result.data as { data: Chat[]; nextCursor: string | null; hasMore: boolean };
  }

  /** Load pending chat requests via REST */
  async fetchRequests(limit = 20, cursor: string | null = null) {
    const url = new URL(`${API_BASE}/chat/requests`, window.location.origin);
    url.searchParams.set("limit", limit.toString());
    if (cursor) url.searchParams.set("cursor", cursor);

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      credentials: "include",
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    const result = await resp.json();
    return result.data as { data: Chat[]; nextCursor: string | null; hasMore: boolean };
  }

  /** Mark a chat as read via REST */
  async markChatRead(chatId: string) {
    const resp = await fetch(`${API_BASE}/chat/${chatId}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
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
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
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
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      credentials: "include",
      body: JSON.stringify({ username: username.trim() }),
    });
    if (!resp.ok) {
      throw await ApiError.fromResponse(resp);
    }
    return await resp.json();
  }
}

export const chatService = new ChatService();
