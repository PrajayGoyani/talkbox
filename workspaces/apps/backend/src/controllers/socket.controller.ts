import { JWT_SECRET_KEY, NODE_ENV } from "@config/env";
import {
  activeChatSchema,
  deleteMessageSchema,
  editMessageSchema,
  reactMessageSchema,
  readChatSchema,
  sendMessageSchema,
  typingSchema,
} from "@schemas/socket.schema";
import { SocketService } from "@services/chat/socket.service";
import { IRedisPresenceService } from "@services/infra/interfaces";
import { IUserCacheService } from "@services/interfaces/user-cache.service";
import { AppError } from "@utils/AppError";
import jwt from "jsonwebtoken";
import { MessageDto } from "shared/types/chat.dto";
import { z } from "zod";

import { AuthenticatedSocketUser, JWTPayload, TypedIO, TypedSocket } from "@/types/socket.types";

type SocketAck = (res: {
  status: "ok" | "error";
  message?: MessageDto;
  error?: string;
  code?: string;
  details?: unknown;
}) => void;

export class SocketController {
  constructor(
    private socketService: SocketService,
    private redisPresenceService: IRedisPresenceService,
    private userCacheService: IUserCacheService,
  ) {}

  private readonly HANDLER_CONFIG: Record<string, { schema: z.Schema<any>; requireVerified: boolean }> = {
    send_message: { schema: sendMessageSchema, requireVerified: true },
    react_message: { schema: reactMessageSchema, requireVerified: true },
    delete_message: { schema: deleteMessageSchema, requireVerified: true },
    edit_message: { schema: editMessageSchema, requireVerified: true },
    typing_start: { schema: typingSchema, requireVerified: true },
    typing_stop: { schema: typingSchema, requireVerified: true },
    read_chat: { schema: readChatSchema, requireVerified: false },
    active_chat: { schema: activeChatSchema, requireVerified: false },
  };

  public configure(io: TypedIO): void {
    // Authenticate socket connection
    io.use(async (socket: TypedSocket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(AppError.unauthorized("Socket authentication error: Token required."));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY) as unknown as JWTPayload;
        const user = await this.userCacheService.getUser(decoded.id);
        if (!user) {
          return next(AppError.unauthorized("User not found"));
        }

        const socketUser: AuthenticatedSocketUser = {
          id: user.id,
          username: user.username,
          name: user.name ?? null,
          avatarUrl: user.avatarUrl || "",
          plan: user.plan,
          isEmailVerified: !!user.isEmailVerified,
          bio: user.bio,
        };
        socket.data.user = socketUser;
        next();
      } catch (error) {
        if (NODE_ENV === "development") {
          console.error(error);
        }
        return next(AppError.unauthorized("Socket authentication error: Invalid Token."));
      }
    });

    io.on("connection", async (socket: TypedSocket) => {
      await this.socketService.handleConnection(socket);

      // Local alias for declarative registration
      const on = <K extends keyof import("@/types/socket.types").ClientToServerEvents>(
        event: K,
        handler: (socket: TypedSocket, data: any, ack?: SocketAck) => Promise<void> | void,
      ) => this.registerEvent(socket, event, handler);

      on("send_message", async (s, d, ack) => {
        const message = await this.socketService.saveAndDeliverMessage(s.data.user, d);
        ack?.({ status: "ok", message });
      });
      on("react_message", (s, d) => void this.socketService.handleReaction(s.data.user, d));
      on("delete_message", (s, d) => void this.socketService.handleDeleteMessage(s.data.user, d));
      on("edit_message", (s, d) => void this.socketService.handleEditMessage(s.data.user, d));
      on("typing_start", (s, d) => void this.socketService.handleTyping(s.data.user, d, true));
      on("typing_stop", (s, d) => void this.socketService.handleTyping(s.data.user, d, false));
      on("read_chat", (s, d) => void this.socketService.handleMarkAsRead(s.data.user.id, d.chatId));
      on("active_chat", (s, d) => void this.redisPresenceService.setActiveChat(s.data.user.id, d.chatId));

      socket.on("disconnect", async () => {
        try {
          await this.redisPresenceService.setActiveChat(socket.data.user.id, null);
        } catch (err) {
          console.error(`[SocketController] Error clearing active chat on disconnect:`, err);
        }
      });

      socket.on("store_public_bundle", async (_bundleData, ack) => {
        ack?.({ status: "ok" });
      });
    });
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  private registerEvent<K extends keyof import("@/types/socket.types").ClientToServerEvents>(
    socket: TypedSocket,
    event: K,
    handler: (socket: TypedSocket, data: any, ack?: SocketAck) => Promise<void> | void,
  ) {
    const config = this.HANDLER_CONFIG[event];
    if (!config) {
      socket.on(event as any, handler as any);
      return;
    }
    socket.on(event as any, this.wrap(socket, config.schema, handler, { requireVerified: config.requireVerified }));
  }

  private isRestricted(user: AuthenticatedSocketUser) {
    return !user.isEmailVerified && user.plan === "free";
  }

  private wrap<T>(
    socket: TypedSocket,
    schema: z.Schema<T>,
    handler: (socket: TypedSocket, data: T, ack?: SocketAck) => Promise<void> | void,
    options?: { requireVerified?: boolean },
  ) {
    return async (data: unknown, ack?: SocketAck) => {
      try {
        if (options?.requireVerified && this.isRestricted(socket.data.user)) {
          throw AppError.verificationRequired("Please verify your email to perform this action.");
        }

        const validatedData = schema.parse(data);
        await handler(socket, validatedData, ack);
      } catch (err: unknown) {
        if (err instanceof z.ZodError) {
          ack?.({ status: "error", error: "Validation failed", details: err.issues });
        } else {
          const error = err as Error & { code?: string };
          const message = error.message || "Internal error";
          ack?.({ status: "error", error: message, code: error.code });
          if (NODE_ENV === "development") {
            console.error(`[SocketController] Error in handler:`, error);
          }
        }
      }
    };
  }
}
