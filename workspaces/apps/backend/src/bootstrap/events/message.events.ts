import { CHAT_EVENTS, eventBus } from "@utils/event-bus";

/**
 * Initialize event listeners for Message actions.
 * Currently, most message-related socket delivery is handled in socket-events.ts.
 * This file is reserved for non-socket side-effects (e.g., analytics, email notifications).
 */
export const initMessageEventListeners = () => {
  eventBus.on(CHAT_EVENTS.MESSAGE_READ, ({ _chatId, _userId }) => {
    // Placeholder for future read-receipt logic (e.g. updating DB or analytics)
  });

  // MESSAGE_SENT, MESSAGE_DELETED, and MESSAGE_UPDATED are handled in socket-events.ts
  // to avoid duplication and ensure consistent real-time delivery.
};
