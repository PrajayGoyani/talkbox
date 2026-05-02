export const CHAT_MESSAGES = {
  MESSAGE_DELETED: "This message was deleted",
  CHAT_DELETED_NOTICE: "Message deleted",
  RATE_LIMIT_EXCEEDED: "You are sending messages too fast. Please slow down.",
  NOT_PARTICIPANT: "You are not a participant in this chat.",
  CHAT_DELETED_ERROR: "Cannot send messages to a deleted chat.",
  DELIVERY_FAILED: "Message delivery failed: Chat is invalid or restricted.",
} as const;
