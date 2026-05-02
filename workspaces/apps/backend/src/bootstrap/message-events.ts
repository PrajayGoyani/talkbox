import { socketService } from "@services/socket.service";
import { CHAT_EVENTS, eventBus } from "@utils/event-bus";

/**
 * Initialize event listeners for Message actions.
 * Handles side-effects like real-time delivery and push notifications.
 */
export const initMessageEventListeners = () => {
  eventBus.on(CHAT_EVENTS.MESSAGE_SENT, ({ dto, participants }) => {
    const io = socketService.io;
    if (!io) return;

    // Real-time delivery to all participants
    participants.forEach((pId: string) => {
      io.to(`user:${pId}`).emit("receive_message", dto);
    });
  });

  eventBus.on(CHAT_EVENTS.MESSAGE_READ, ({ _chatId, _userId }) => {
    // Logic for updating read receipts across devices if needed
  });

  eventBus.on(CHAT_EVENTS.MESSAGE_DELETED, ({ participants, ...payload }) => {
    const io = socketService.io;
    if (!io) return;

    participants.forEach((p: any) => {
      io.to(`user:${p.toString()}`).emit("message_deleted", payload);
    });
  });

  eventBus.on(CHAT_EVENTS.MESSAGE_UPDATED, ({ participants, ...payload }) => {
    const io = socketService.io;
    if (!io) return;

    participants.forEach((p: any) => {
      io.to(`user:${p.toString()}`).emit("message_updated", payload);
    });
  });
};
