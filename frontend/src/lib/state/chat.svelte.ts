import type { Chat, Message, MessageAlert } from "$types/chat";
import type { Notification } from "$types/notification";
import type { Socket } from "socket.io-client";

import { chatService } from "$services/chat.service";
import { notificationService } from "$services/notification.service";
import { SocketManager } from "$services/socket.manager.svelte";
import { messageStore } from "$state/active-chat.svelte";
import { authStore } from "$state/auth.svelte";
import { routerStore } from "$state/router.svelte";

import { chatListStore } from "./chat/chat-list.svelte";
import { presenceStore } from "./chat/presence.svelte";

export * from "$types/chat";

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
    return messageStore.isSendingMessage;
  }
  set isSendingMessage(val: boolean) {
    messageStore.isSendingMessage = val;
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
  isConnected = $state(false);

  private socketManager: SocketManager;
  private onChatListRefresh: (() => void) | null = null;
  private onToastCallback: ((data: MessageAlert) => void) | null = null;

  constructor() {
    this.socketManager = new SocketManager(this);
  }

  get socket(): Socket | null {
    return this.socketManager.socket;
  }

  onRefreshChats(cb: () => void) {
    this.onChatListRefresh = cb;
  }

  onToast(cb: (data: MessageAlert) => void) {
    this.onToastCallback = cb;
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
    messageStore.isSendingMessage = true;
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

  // --- Handlers ---
  handleReceiveMessage(message: Message) {
    messageStore.handleReceiveMessage(message);
    presenceStore.setTyping(message.chatId, message.senderId, false);

    const isViewing = message.chatId === messageStore.activeChatId;
    const isOtherUser = message.senderId !== authStore.user?.id;
    const shouldInc = !isViewing && isOtherUser;

    if (isOtherUser) {
      notificationService.notify({
        chatId: message.chatId,
        senderId: message.senderId,
        senderUsername: chatListStore.chatsMap?.get(message.chatId)?.otherUser?.username || message.senderId,
        preview: message.contentBody,
      });
    }

    const currentChat = chatListStore.chatsMap?.get(message.chatId);
    const currentUnread = currentChat?.unreadCount || 0;

    chatListStore.patchChatLocally(
      message.chatId,
      {
        lastMessage: {
          contentBody: message.contentBody,
          senderId: message.senderId,
          sentAt: message.createdAt,
        },
        unreadCount: shouldInc ? currentUnread + 1 : currentUnread,
      },
      true,
    );
  }

  handleMessageAlert(data: MessageAlert) {
    const isChatOpen = data.chatId === messageStore.activeChatId;
    if (isChatOpen && document.hasFocus()) {
      void this.markChatRead(data.chatId);
    }
    if (!document.hasFocus()) {
      notificationService.showBrowserNotification(data);
    }
    if (this.onToastCallback && !isChatOpen) {
      this.onToastCallback(data);
    }
  }

  handleNotification(notification: Notification) {
    if (notification.type === "chat_request") {
      chatListStore.pendingRequestCount += 1;
      if (this.onToastCallback) {
        this.onToastCallback({
          chatId: notification.referenceId,
          senderUsername: "System",
          preview: notification.message,
        } as any);
      }
      if (routerStore.segments[1] === "requests") {
        void chatListStore.fetchRequests();
      }
      notificationService.notify({
        chatId: notification.referenceId,
        senderId: "system",
        senderUsername: "System",
        preview: notification.message,
      });
    }
    if (this.onChatListRefresh) this.onChatListRefresh();
  }

  handleChatAccepted(_data: { chatId: string }) {
    void chatListStore.fetchChats();
    if (routerStore.segments[1] === "requests") void chatListStore.fetchRequests();
    if (this.onChatListRefresh) this.onChatListRefresh();
  }

  handleReactionUpdate(data: any) {
    messageStore.handleReactionUpdate(data);
  }

  handleMessageDeleted(data: { messageId: string; chatId: string; isLastMessage?: boolean }) {
    messageStore.handleMessageDeleted(data);
    const chat = chatListStore.chatsMap?.get(data.chatId);
    if (
      chat?.lastMessage &&
      (data.isLastMessage ||
        (messageStore.activeChatId === data.chatId &&
          messageStore.messages[messageStore.messages.length - 1]?.id === data.messageId))
    ) {
      chatListStore.patchChatLocally(data.chatId, {
        lastMessage: { ...chat.lastMessage, contentBody: "Message deleted" },
      });
    }
  }

  handleMessageUpdated(data: any) {
    messageStore.handleMessageUpdated(data);
    const chat = chatListStore.chatsMap?.get(data.chatId);
    if (
      chat?.lastMessage &&
      messageStore.activeChatId === data.chatId &&
      messageStore.messages[messageStore.messages.length - 1]?.id === data.messageId
    ) {
      chatListStore.patchChatLocally(data.chatId, {
        lastMessage: { ...chat.lastMessage, contentBody: data.contentBody },
      });
    }
  }

  handleMessageSentAck(chatId: string, message: Message) {
    messageStore.handleMessageSentAck(chatId, message);
    chatListStore.patchChatLocally(
      chatId,
      {
        lastMessage: {
          contentBody: message.contentBody,
          senderId: message.senderId,
          sentAt: message.createdAt,
        },
      },
      true,
    );
  }

  handleProfileUpdate(data: { userId: string } & Partial<Chat["otherUser"]>) {
    const { userId, ...updates } = data;
    chatListStore.chats.forEach((chat) => {
      if (chat.otherUser?.id === userId) Object.assign(chat.otherUser, updates);
    });
    if (updates.name || updates.username) chatListStore.sortChats(false);
  }
}

export const chatStore = new ChatStore();
