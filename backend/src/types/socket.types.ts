import { Socket, Server } from "socket.io";

/**
 * Payload decoded from JWT token during socket connection.
 */
export interface JWTPayload {
  id: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * User data attached to the socket instance after authentication.
 */
export interface AuthenticatedSocketUser {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string;
  plan: "free" | "pro";
}

/**
 * Typed Socket data object.
 */
export interface SocketData {
  user: AuthenticatedSocketUser;
}

/**
 * Interface for Message Data Transfer Object.
 */
export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  contentBody: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;

  deletedAt?: Date | null;
  emojiMetadata?: Record<string, string>;
  isScrubbed?: boolean;
  reactions?: Array<{
    emoji: string;
    slug: string;
    users: string[];
  }>;
}

/**
 * Interface for Notification Data Transfer Object.
 */
export interface NotificationDto {
  _id: string;
  recipientId: string;
  senderId: {
    _id: string;
    username: string;
    email: string;
    avatar_url: string;
  };
  type: "chat_request" | "request_accepted" | "request_rejected" | "new_message";
  referenceId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ServerToClientEvents {
  session_error: (payload: { reason: string; message: string }) => void;
  error: (payload: { message: string }) => void;
  user_status: (payload: { userId: string; isOnline: boolean; lastSeen: Date | null }) => void;
  typing_start: (payload: { chatId: string; userId: string }) => void;
  typing_stop: (payload: { chatId: string; userId: string }) => void;
  message_reaction_update: (payload: {
    messageId: string;
    chatId: string;
    reactions: Array<{ emoji: string; slug: string; users: string[] }>;
  }) => void;
  receive_message: (payload: MessageDto) => void;
  message_alert: (payload: {
    chatId: string;
    senderId: string;
    senderName: string | null;
    senderUsername: string;
    senderAvatar: string;
    preview: string;
  }) => void;
  message_deleted: (payload: { messageId: string; chatId: string; isLastMessage: boolean }) => void;
  message_updated: (payload: {
    messageId: string;
    chatId: string;
    contentBody: string;
    isEdited: boolean;
    editedAt: Date;
  }) => void;
  notification: (payload: NotificationDto) => void;
  chat_accepted: (payload: { chatId: string }) => void;
}

export interface ClientToServerEvents {
  send_message: (
    data: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
    callback?: (res: { status: "ok" | "error"; message?: MessageDto; error?: string }) => void,
  ) => void;
  react_message: (data: { messageId: string; emoji: string; slug?: string }) => void;
  delete_message: (data: { messageId: string }) => void;
  edit_message: (data: { messageId: string; contentBody: string }) => void;
  store_public_bundle: (bundleData: any, callback?: (res: { status: "ok" | "error" }) => void) => void;
  typing_start: (data: { receiverId: string; chatId: string }) => void;
  typing_stop: (data: { receiverId: string; chatId: string }) => void;
}

export interface InterServerEvents {}

/**
 * Fully typed Socket and Server instances.
 */
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type TypedIO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
