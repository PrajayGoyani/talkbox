import type { Message, MessageAlert } from "$types/chat";
import type { Notification } from "$types/notification";

import { chatService } from "$services/chat.service";
import { notificationService } from "$services/notification.service";
import { messageStore } from "$state/active-chat.svelte";
import { authStore } from "$state/auth.svelte";
import { chatListStore } from "$state/chat/chat-list.svelte";
import { presenceStore } from "$state/chat/presence.svelte";
import { routerStore } from "$state/router.svelte";

import type { ChatStoreSocket } from "./socket.manager.svelte";

export class SocketHandler implements ChatStoreSocket {
  isConnected = $state(false);
  isSendingMessage = $state(false);

  get activeChatId() {
    return messageStore.activeChatId;
  }

  get typingStatus() {
    return presenceStore.typingStatus;
  }

  get onlineStatus() {
    return presenceStore.onlineStatus;
  }

  private onChatListRefresh: (() => void) | null = null;
  private onToastCallback: ((data: MessageAlert) => void) | null = null;

  setCallbacks(callbacks: { onRefresh?: () => void; onToast?: (data: MessageAlert) => void }) {
    this.onChatListRefresh = callbacks.onRefresh || null;
    this.onToastCallback = callbacks.onToast || null;
  }

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
        senderUsername:
          chatListStore.chatsMap?.get(message.chatId)?.otherUser?.username || message.senderId,
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
      void chatService.markChatRead(data.chatId).then(() => {
        chatListStore.patchChatLocally(data.chatId, { unreadCount: 0 });
      });
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

  handleReactionUpdate(data: {
    messageId: string;
    chatId: string;
    reactions: Array<{ emoji: string; slug?: string; users: string[] }>;
  }) {
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

  handleMessageUpdated(data: {
    messageId: string;
    chatId: string;
    contentBody: string;
    isEdited: boolean;
    editedAt: string;
  }) {
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

  handleProfileUpdate(data: { userId: string } & Partial<import("$types/chat").User>) {
    const { userId, ...updates } = data;
    chatListStore.chats.forEach((chat) => {
      if (chat.otherUser?.id === userId) Object.assign(chat.otherUser, updates);
    });
    if (updates.name || updates.username) chatListStore.sortChats(false);
  }
}
