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
}

/**
 * Typed Socket data object.
 */
export interface SocketData {
  user: AuthenticatedSocketUser;
}

/**
 * Fully typed Socket and Server instances.
 * Use these to avoid 'any' when dealing with socket.io instances.
 */
export type TypedSocket = Socket<any, any, any, SocketData>;
export type TypedIO = Server<any, any, any, SocketData>;
