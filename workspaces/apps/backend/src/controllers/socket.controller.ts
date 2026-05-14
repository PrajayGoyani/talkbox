import { activeChatSchema, deleteMessageSchema, editMessageSchema, reactMessageSchema, readChatSchema, sendMessageSchema, typingSchema } from "@schemas/socket.schema";
import { SocketService } from "@services/chat/socket.service";
import { IRedisPresenceService } from "@services/infra/interfaces";
import { AppError } from "@utils/AppError";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { AuthenticatedSocketUser, JWTPayload, TypedIO, TypedSocket } from "@/types/socket.types";
import { JWT_SECRET_KEY, NODE_ENV } from "@config/env";
import { IUserCacheService } from "@services/interfaces/user-cache.service";

export class SocketController {
  constructor(
    private socketService: SocketService,
    private redisPresenceService: IRedisPresenceService,
    private userCacheService: IUserCacheService,
  ) {}

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

      const wrap = <T>(
        schema: z.Schema<T>,
        handler: (socket: TypedSocket, data: T, ack?: (res: any) => void) => Promise<void> | void,
      ) => {
        return async (data: any, ack?: (res: any) => void) => {
          try {
            const validatedData = schema.parse(data);
            await handler(socket, validatedData, ack);
          } catch (err: any) {
            if (err instanceof z.ZodError) {
              ack?.({ status: "error", error: "Validation failed", details: err.issues });
            } else {
              const message = err.message || "Internal error";
              ack?.({ status: "error", error: message });
              if (NODE_ENV === "development") {
                console.error(`[SocketController] Error in handler:`, err);
              }
            }
          }
        };
      };

      socket.on(
        "send_message",
        wrap(sendMessageSchema, async (s, data, ack) => {
          const message = await this.socketService.saveAndDeliverMessage(s.data.user, data);
          ack?.({ status: "ok", message });
        }),
      );

      socket.on(
        "react_message",
        wrap(reactMessageSchema, (s, data) => {
          void this.socketService.handleReaction(s.data.user, data);
        }),
      );

      socket.on(
        "delete_message",
        wrap(deleteMessageSchema, (s, data) => {
          void this.socketService.handleDeleteMessage(s.data.user, data);
        }),
      );

      socket.on(
        "edit_message",
        wrap(editMessageSchema, (s, data) => {
          void this.socketService.handleEditMessage(s.data.user, data);
        }),
      );

      socket.on(
        "typing_start",
        wrap(typingSchema, (s, data) => {
          void this.socketService.handleTyping(s.data.user, data, true);
        }),
      );

      socket.on(
        "typing_stop",
        wrap(typingSchema, (s, data) => {
          void this.socketService.handleTyping(s.data.user, data, false);
        }),
      );

      socket.on(
        "read_chat",
        wrap(readChatSchema, async (s, data) => {
          await this.socketService.handleMarkAsRead(s.data.user.id, data.chatId);
        }),
      );

      socket.on(
        "active_chat",
        wrap(activeChatSchema, async (s, data) => {
          await this.redisPresenceService.setActiveChat(s.data.user.id, data.chatId);
        }),
      );

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
}
