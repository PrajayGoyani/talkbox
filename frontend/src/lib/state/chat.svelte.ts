import type { MessageAlert } from "$types/chat";
import type { Socket } from "socket.io-client";

import { chatService } from "$services/chat.service";
import { SocketHandler } from "$services/socket-handler.svelte";
import { SocketManager } from "$services/socket.manager.svelte";
import { messageStore } from "$state/active-chat.svelte";

import { chatListStore } from "./chat/chat-list.svelte";
import { presenceStore } from "./chat/presence.svelte";

export * from "$types/chat";

/**
 * Facade for Chat-related state and actions.
 * Orchestrates multiple domain stores (messageStore, chatListStore, presenceStore)
 * and delegates socket management to SocketManager via SocketHandler.
 */
class ChatStore {
  // --- Delegated State ---
  get messages() {
    return messageStore.messages;
  }
  get hasMoreMessages() {
    return messageStore.hasMoreMessages;
  }
  get isLoadingMessages() {
    return messageStore.isLoadingMessages;
  }
  get isSendingMessage() {
    return this.socketHandler.isSendingMessage;
  }
  set isSendingMessage(val: boolean) {
    this.socketHandler.isSendingMessage = val;
  }
  get activeChatId() {
    return messageStore.activeChatId;
  }

  get chats() {
    return chatListStore.chats;
  }
  get requests() {
    return chatListStore.requests;
  }
  get hasMoreChats() {
    return chatListStore.hasMoreChats;
  }
  get isLoadingMoreChats() {
    return chatListStore.isLoadingMoreChats;
  }
  get unreadChatsCount() {
    return chatListStore.unreadChatsCount;
  }
  get pendingRequestCount() {
    return chatListStore.pendingRequestCount;
  }
  set pendingRequestCount(val: number) {
    chatListStore.pendingRequestCount = val;
  }

  get currentSearchQuery() {
    return chatListStore.currentSearchQuery;
  }
  set currentSearchQuery(val: string) {
    chatListStore.currentSearchQuery = val;
  }

  get onlineStatus() {
    return presenceStore.onlineStatus;
  }
  get typingStatus() {
    return presenceStore.typingStatus;
  }

  lastError: string | null = $state(null);

  get isConnected() {
    return this.socketHandler.isConnected;
  }
  set isConnected(val: boolean) {
    this.socketHandler.isConnected = val;
  }

  private socketManager: SocketManager;
  private socketHandler: SocketHandler;

  constructor() {
    this.socketHandler = new SocketHandler();
    this.socketManager = new SocketManager(this.socketHandler);
  }

  get socket(): Socket | null {
    return this.socketManager.socket;
  }

  onRefreshChats(cb: () => void) {
    this.socketHandler.setCallbacks({ onRefresh: cb });
  }

  onToast(cb: (data: MessageAlert) => void) {
    this.socketHandler.setCallbacks({ onToast: cb });
  }

  // --- Connection ---
  async connect() {
    return this.socketManager.connect();
  }

  disconnect() {
    this.socketManager.disconnect();
    messageStore.clear();
    presenceStore.clear();
  }

  // --- Actions ---
  async loadMessages(chatId: string) {
    return messageStore.initialize(chatId);
  }
  async loadOlderMessages() {
    return messageStore.loadOlderMessages();
  }
  async fetchChats(query = "") {
    return chatListStore.fetchChats(query);
  }
  async loadMoreChats() {
    return chatListStore.loadMoreChats();
  }
  async fetchRequests() {
    return chatListStore.fetchRequests();
  }
  async loadMoreRequests() {
    return chatListStore.loadMoreRequests();
  }

  async markChatRead(chatId: string) {
    try {
      await chatService.markChatRead(chatId);
      chatListStore.patchChatLocally(chatId, { unreadCount: 0 });
    } catch (e) {
      console.error("Failed to mark chat as read:", e);
    }
  }

  async acceptChat(chatId: string) {
    try {
      await chatService.acceptChat(chatId);
      await Promise.all([chatListStore.fetchChats(), chatListStore.fetchRequests()]);
    } catch (e: any) {
      this.lastError = e.message || "Failed to accept chat";
      throw e;
    }
  }

  async rejectChat(chatId: string) {
    try {
      await chatService.rejectChat(chatId);
      await chatListStore.fetchRequests();
    } catch (e: any) {
      this.lastError = e.message || "Failed to reject chat";
      throw e;
    }
  }

  async sendChatRequest(username: string) {
    const result = await chatService.sendChatRequest(username);
    await chatListStore.fetchRequests();
    return result;
  }

  toggleChatPin(chatId: string) {
    chatListStore.toggleChatPin(chatId);
  }

  // --- Socket Operations ---
  async sendMessage(chatId: string, receiverId: string, contentBody: string) {
    this.socketHandler.isSendingMessage = true;
    this.socketManager.sendMessage(chatId, receiverId, contentBody);
  }

  emitTyping(chatId: string, receiverId: string, isTyping: boolean) {
    this.socketManager.emitTyping(chatId, receiverId, isTyping);
  }

  reactToMessage(messageId: string, emoji: string, slug?: string) {
    this.socketManager.reactToMessage(messageId, emoji, slug);
  }

  deleteMessage(messageId: string) {
    this.socketManager.deleteMessage(messageId);
  }

  editMessage(messageId: string, contentBody: string) {
    this.socketManager.editMessage(messageId, contentBody);
  }
}

export const chatStore = new ChatStore();
