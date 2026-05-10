import { chatService } from "$services/chat.service";
import { RealtimeEvent, realtimeEvents } from "$services/realtime-events";
import { socketManager } from "$services/socket.manager.svelte";
import { messageStore } from "$state/active-chat.svelte";
import { authStore } from "../auth.svelte";
import { chatListStore } from "./chat-list.svelte";

class ChatActions {
  lastError: string | null = $state(null);

  onRefreshChats(cb: () => void) {
    const u1 = realtimeEvents.on(RealtimeEvent.CHAT_ACCEPTED, cb);
    const u2 = realtimeEvents.on(RealtimeEvent.NOTIFICATION_RECEIVED, cb);
    return () => {
      u1();
      u2();
    };
  }

  onToast(cb: (data: any) => void) {
    const u1 = realtimeEvents.on(RealtimeEvent.MESSAGE_RECEIVED, (data) => {
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

    const u2 = realtimeEvents.on(RealtimeEvent.NOTIFICATION_RECEIVED, (notification) => {
      if (notification.type === "chat_request") {
        cb({
          chatId: notification.referenceId,
          senderUsername: "System",
          preview: notification.message,
        } as any);
      }
    });

    return () => {
      u1();
      u2();
    };
  }

  async loadMessages(chatId: string) {
    await messageStore.initialize(chatId);
    chatListStore.patchChatLocally(chatId, { unreadCount: 0 });
  }

  async markChatRead(chatId: string) {
    try {
      socketManager.markChatRead(chatId);
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
}

export const chatActions = new ChatActions();
