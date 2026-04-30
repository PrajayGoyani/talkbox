import { EventEmitter } from "events";

/**
 * Global Event Bus for decoupled service communication.
 * Primarily used to trigger notifications and side-effects from core services.
 */
class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

// --- Event Names Constants ---
export const CHAT_EVENTS = {
  REQUESTED: "chat.requested",
  ACCEPTED: "chat.accepted",
  REJECTED: "chat.rejected",
  DELETED: "chat.deleted",
  MESSAGE_SENT: "message.sent",
  MESSAGE_READ: "message.read",
} as const;
