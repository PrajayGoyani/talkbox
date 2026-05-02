import { socketService } from "@services/socket.service";
import { eventBus, CHAT_EVENTS } from "@utils/event-bus";

/**
 * Initialize socket event listeners for real-time delivery.
 * Decouples message delivery from transport management.
 */
export const initSocketEventListeners = () => {
  // 1. Message Sent
  eventBus.on(CHAT_EVENTS.MESSAGE_SENT, ({ message, chat, sender, receiverId }) => {
    if (!socketService.io) return;

    for (const p of chat.participants) {
      const pId = p.toString();
      socketService.io.to(`user:${pId}`).emit("receive_message", {
        ...message,
        senderName: sender.name || null,
        senderUsername: sender.username,
        senderAvatar: sender.avatarUrl,
      });
    }
  });

  // 2. Message Deleted
  eventBus.on(CHAT_EVENTS.MESSAGE_DELETED, ({ messageId, chatId, participants, isLastMessage }) => {
    if (!socketService.io) return;

    const updatePayload = {
      messageId,
      chatId,
      isLastMessage,
    };

    participants.forEach((pId: string) => {
      socketService.io?.to(`user:${pId}`).emit("message_deleted", updatePayload);
    });
  });

  // 3. Message Updated
  eventBus.on(CHAT_EVENTS.MESSAGE_UPDATED, ({ messageId, chatId, contentBody, isEdited, editedAt, participants }) => {
    if (!socketService.io) return;

    const updatePayload = {
      messageId,
      chatId,
      contentBody,
      isEdited,
      editedAt,
    };

    participants.forEach((pId: string) => {
      socketService.io?.to(`user:${pId}`).emit("message_updated", updatePayload);
    });
  });

  // 4. Message Reaction Updated
  eventBus.on(CHAT_EVENTS.REACTION_UPDATED, ({ payload, participants }) => {
    if (!socketService.io) return;

    participants.forEach((pId: string) => {
      socketService.io?.to(`user:${pId}`).emit("message_reaction_update", payload);
    });
  });
};
