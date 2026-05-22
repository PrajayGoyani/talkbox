import { registry } from "@bootstrap/registry/registry";
import { eventBus, CHAT_EVENTS } from "@utils/event-bus";

/**
 * Initialize event listeners for Chat actions.
 * This decouples the core logic in ChatActionService from side-effects
 * like creating notifications and emitting socket events.
 */
export const initChatEventListeners = () => {
  // 1. Chat Requested
  eventBus.on(CHAT_EVENTS.REQUESTED, async ({ chat, senderId, targetUserId, senderUsername }) => {
    const notification = await registry.notificationService.create({
      recipientId: targetUserId,
      senderId: senderId,
      type: "chat_request",
      referenceId: chat._id,
      message: `${senderUsername} sent you a chat request`,
    });

    registry.socketService.emitToUser(targetUserId, "notification", notification as any);
  });

  // 2. Chat Accepted
  eventBus.on(CHAT_EVENTS.ACCEPTED, async ({ chat, userId, acceptorUsername }) => {
    const notification = await registry.notificationService.create({
      recipientId: chat.createdBy,
      senderId: userId,
      type: "request_accepted",
      referenceId: chat._id,
      message: `${acceptorUsername || "A user"} accepted your chat request`,
    });

    registry.socketService.emitToUser(chat.createdBy.toString(), "notification", notification as any);
    registry.socketService.emitToUser(chat.createdBy.toString(), "chat_accepted", { chatId: chat._id.toString() });
  });

  // 3. Chat Rejected
  eventBus.on(CHAT_EVENTS.REJECTED, async ({ chat, userId, rejectorUsername }) => {
    const notification = await registry.notificationService.create({
      recipientId: chat.createdBy,
      senderId: userId,
      type: "request_rejected",
      referenceId: chat._id,
      message: `${rejectorUsername || "A user"} declined your chat request`,
    });

    registry.socketService.emitToUser(chat.createdBy.toString(), "notification", notification as any);
  });

  // 4. Chat Deleted
  eventBus.on(CHAT_EVENTS.DELETED, async ({ chatId, userId }) => {
    // Logic for deletion notification if needed
  });
};
