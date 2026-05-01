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
  MESSAGE_DELETED: "message.deleted",
  MESSAGE_UPDATED: "message.updated",
} as const;

export const USER_EVENTS = {
  PROFILE_UPDATED: "user.profile_updated",
  PRESENCE_CHANGED: "user.presence_changed",
} as const;

export const AUTH_EVENTS = {
  LOGIN_SUCCESS: "auth.login_success",
  LOGOUT: "auth.logout",
} as const;
