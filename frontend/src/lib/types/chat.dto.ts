/**
 * Raw message received from socket.io before mapping identifiers.
 */
export interface RawMessageDto {
  _id?: string;
  id?: string;
  chatId: string;
  senderId: string;
  contentBody: string;
  createdAt: string;
  idempotencyKey?: string;
  attachment?: {
    kind: "image" | "audio" | "video" | "document" | null;
    url: string | null;
    originalName?: string | null;
    fileSize?: number | null;
  };
}

/**
 * Socket acknowledgement response.
 */
export interface MessageAckDto {
  status: "ok" | "error";
  message?: RawMessageDto;
  error?: string;
}

/**
 * User presence data from socket.
 */
export interface UserStatusDto {
  userId: string;
  isOnline: boolean;
  lastSeen: string | Date | null;
}

/**
 * Typing indicator data from socket.
 */
export interface TypingIndicatorDto {
  chatId: string;
  userId: string;
}
