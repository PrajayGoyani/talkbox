import type { Socket } from "socket.io-client";

import { chatService } from "$services/chat.service";
import { RealtimeEvent, realtimeEvents } from "$services/realtime-events";
import { socketManager } from "$services/socket.manager.svelte";
import { messageStore } from "$state/active-chat.svelte";

import { authStore } from "./auth.svelte";
import { chatListStore } from "./chat/chat-list.svelte";
import { presenceStore } from "./chat/presence.svelte";

export * from "$lib/types/chat";

/**
 * Facade for Chat-related state and actions.
 * Orchestrates multiple domain stores (messageStore, chatListStore, presenceStore)
 * and coordinates with the SocketManager.
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
    return this.socketManager.isSendingMessage;
  }
  set isSendingMessage(val: boolean) {
    this.socketManager.isSendingMessage = val;
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
    return this.socketManager.isConnected;
  }
  set isConnected(val: boolean) {
    this.socketManager.isConnected = val;
  }

  private socketManager = socketManager;

  constructor() {
    // this.socketManager = new SocketManager();
    // No longer instantiates - uses singleton
  }

  get socket(): Socket | null {
    return this.socketManager.socket;
  }

  onRefreshChats(cb: () => void) {
    realtimeEvents.on(RealtimeEvent.CHAT_ACCEPTED, cb);
    realtimeEvents.on(RealtimeEvent.NOTIFICATION_RECEIVED, cb);
  }

  onToast(cb: (data: any) => void) {
    realtimeEvents.on(RealtimeEvent.MESSAGE_RECEIVED, (data) => {
      const isChatOpen = data.chatId === messageStore.activeChatId;
      const isOtherUser = data.senderId !== authStore.user?.id;

      if (!isChatOpen && isOtherUser) {
        const contentBody = data.contentBody || "";
        const preview = contentBody.length > 60 ? contentBody.substring(0, 60) + "..." : contentBody;

        cb({
          chatId: data.chatId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderUsername: data.senderUsername,
          senderAvatar: data.senderAvatar,
          preview,
        });
      }
    });

    realtimeEvents.on(RealtimeEvent.NOTIFICATION_RECEIVED, (notification) => {
      if (notification.type === "chat_request") {
        cb({
          chatId: notification.referenceId,
          senderUsername: "System",
          preview: notification.message,
        } as any);
      }
    });
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
    await messageStore.initialize(chatId);
    chatListStore.patchChatLocally(chatId, { unreadCount: 0 });
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
      this.socketManager.markChatRead(chatId);
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
