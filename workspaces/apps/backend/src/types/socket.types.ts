import { Server, Socket } from "socket.io";
export type { ClientToServerEvents, ServerToClientEvents } from "shared/types/socket.dto";

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
  isEmailVerified: boolean;
  bio?: string | null;
}

/**
 * Typed Socket data object.
 */
export interface SocketData {
  user: AuthenticatedSocketUser;
}

export interface InterServerEvents {}

/**
 * Fully typed Socket and Server instances.
 */
export type TypedSocket = Socket<
  import("shared/types/socket.dto").ClientToServerEvents,
  import("shared/types/socket.dto").ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type TypedIO = Server<
  import("shared/types/socket.dto").ClientToServerEvents,
  import("shared/types/socket.dto").ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
