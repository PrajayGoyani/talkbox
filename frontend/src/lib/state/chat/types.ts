import type { Chat, MessageAlertDto } from "$lib/types/chat";
import type { MessageDto } from "@root/shared/types/chat.dto";

export interface IChatListStore {
  chats: Chat[];
  requests: Chat[];
  hasMoreChats: boolean;
  hasMoreRequests: boolean;
  unreadChatsCount: number;
  pendingRequestCount: number;
  fetchChats(query?: string): Promise<Chat[] | undefined>;
  loadMoreChats(): Promise<void>;
  fetchRequests(): Promise<Chat[] | undefined>;
  loadMoreRequests(): Promise<void>;
  toggleChatPin(chatId: string): void;
  patchChatLocally(chatId: string, updates: Partial<Chat>, moveToTop?: boolean): void;
}

export interface IPresenceStore {
  onlineStatus: Map<string, { isOnline: boolean; lastSeen: Date | null }>;
  typingStatus: Map<string, Set<string>>;
  setOnline(userId: string, isOnline: boolean, lastSeen?: Date | null): void;
  setTyping(chatId: string, userId: string, isTyping: boolean): void;
}
