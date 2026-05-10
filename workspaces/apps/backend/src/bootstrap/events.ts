import { initAuthEventListeners } from "./auth-events";
import { initChatEventListeners } from "./chat-events";
import { initMessageEventListeners } from "./message-events";
import { initSocketEventListeners } from "./socket-events";
import { initUserEventListeners } from "./user-events";

/**
 * Global Event Initialization.
 * Registers all domain-specific event listeners to the EventBus.
 */
export const initEventListeners = () => {
  initAuthEventListeners();
  initChatEventListeners();
  initMessageEventListeners();
  initSocketEventListeners();
  initUserEventListeners();
};
