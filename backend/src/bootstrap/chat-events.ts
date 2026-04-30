import { chatService } from "@services/chat.service";
import { notificationService } from "@services/notification.service";
import { eventBus, CHAT_EVENTS } from "@utils/event-bus";

/**
 * Initialize event listeners for Chat actions.
 * This decouples the core logic in ChatActionService from side-effects
 * like creating notifications and emitting socket events.
 */
export const initChatEventListeners = () => {
  // 1. Chat Requested
  eventBus.on(CHAT_EVENTS.REQUESTED, async ({ chat, senderId, targetUserId, senderUsername }) => {
    const notification = await notificationService.create({
      recipientId: targetUserId,
      senderId: senderId,
      type: "chat_request",
      referenceId: chat._id,
      message: `${senderUsername} sent you a chat request`,
    });

    if (chatService.io) {
      chatService.io.to(`user:${targetUserId}`).emit("notification", notification);
    }
  });

  // 2. Chat Accepted
  eventBus.on(CHAT_EVENTS.ACCEPTED, async ({ chat, userId, acceptorUsername }) => {
    const notification = await notificationService.create({
      recipientId: chat.createdBy,
      senderId: userId,
      type: "request_accepted",
      referenceId: chat._id,
      message: `${acceptorUsername || "A user"} accepted your chat request`,
    });

    if (chatService.io) {
      chatService.io.to(`user:${chat.createdBy}`).emit("notification", notification);
      chatService.io.to(`user:${chat.createdBy}`).emit("chat_accepted", { chatId: chat._id });
    }
  });

  // 3. Chat Rejected
  eventBus.on(CHAT_EVENTS.REJECTED, async ({ chat, userId, rejectorUsername }) => {
    const notification = await notificationService.create({
      recipientId: chat.createdBy,
      senderId: userId,
      type: "request_rejected",
      referenceId: chat._id,
      message: `${rejectorUsername || "A user"} declined your chat request`,
    });

    if (chatService.io) {
      chatService.io.to(`user:${chat.createdBy}`).emit("notification", notification);
    }
  });

  // 4. Chat Deleted
  eventBus.on(CHAT_EVENTS.DELETED, async ({ chatId, userId }) => {
    // Logic for deletion notification if needed
    console.log(`[EventBus] Chat ${chatId} deleted by user ${userId}`);
  });
};
