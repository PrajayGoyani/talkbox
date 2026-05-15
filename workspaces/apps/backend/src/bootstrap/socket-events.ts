import { registry } from "@bootstrap/registry";
import { eventBus, CHAT_EVENTS } from "@utils/event-bus";

/**
 * Initialize socket event listeners for real-time delivery.
 * Decouples message delivery from transport management.
 */
export const initSocketEventListeners = () => {
  // 1. Message Sent
  eventBus.on(CHAT_EVENTS.MESSAGE_SENT, ({ message, chat, sender, receiverId }) => {
    const participantIds = chat.participants.map((p: any) => p.toString());
    registry.socketService.emitToUsers(participantIds, "receive_message", {
      ...message,
      senderName: sender.name || null,
      senderUsername: sender.username,
      senderAvatar: sender.avatarUrl,
    });
  });

  // 2. Message Deleted
  eventBus.on(CHAT_EVENTS.MESSAGE_DELETED, ({ messageId, chatId, participants, isLastMessage }) => {
    registry.socketService.emitToUsers(participants, "message_deleted", {
      messageId,
      chatId,
      isLastMessage,
    });
  });

  // 3. Message Updated
  eventBus.on(CHAT_EVENTS.MESSAGE_UPDATED, ({ messageId, chatId, contentBody, isEdited, editedAt, participants }) => {
    registry.socketService.emitToUsers(participants, "message_updated", {
      messageId,
      chatId,
      contentBody,
      isEdited,
      editedAt,
    });
  });

  // 4. Message Reaction Updated
  eventBus.on(CHAT_EVENTS.REACTION_UPDATED, ({ payload, participants }) => {
    registry.socketService.emitToUsers(participants, "message_reaction_update", payload);
  });
};
