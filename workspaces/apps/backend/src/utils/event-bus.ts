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
  REACTION_UPDATED: "message.reaction_updated",
} as const;

export const USER_EVENTS = {
  PROFILE_UPDATED: "user.profile_updated",
  PRESENCE_CHANGED: "user.presence_changed",
} as const;

export const AUTH_EVENTS = {
  LOGIN_SUCCESS: "auth.login_success",
  LOGOUT: "auth.logout",
  VERIFICATION_REQUIRED: "auth.verification_required",
  PASSWORD_RESET_REQUESTED: "auth.password_reset_requested",
  UPGRADED: "auth.upgraded",
} as const;
