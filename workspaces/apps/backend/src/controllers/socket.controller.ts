import { JWT_SECRET_KEY, NODE_ENV } from "@config/env";
import { userCacheService } from "@services/auth/user-cache.service";
import { socketService } from "@services/chat/socket.service";
import { redisPresenceService } from "@services/infra/redis.service";
import { AppError } from "@utils/AppError";
import jwt from "jsonwebtoken";

import { AuthenticatedSocketUser, JWTPayload, TypedIO, TypedSocket } from "@/types/socket.types";

export const configureSocketServer = (io: TypedIO): void => {
  socketService.init(io);

  // Chat Security Auditor: Authenticate socket connection
  io.use(async (socket: TypedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(AppError.unauthorized("Socket authentication error: Token required."));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY) as unknown as JWTPayload;

      const user = await userCacheService.getUser(decoded.id);
      if (!user) {
        return next(AppError.unauthorized("User not found"));
      }

      // Map UserDto → AuthenticatedSocketUser for socket context
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
    await socketService.handleConnection(socket);

    socket.on("send_message", async (data, ack) => {
      if (NODE_ENV === "development") {
        console.log(`[SocketController] send_message received from user ${socket.data.user.id}:`, data);
      }
      try {
        const message = await socketService.saveAndDeliverMessage(socket.data.user, data);
        if (ack) ack({ status: "ok", message });
      } catch (err) {
        if (ack) ack({ status: "error", error: (err as Error).message });
      }
    });

    socket.on("react_message", async (data) => {
      void socketService.handleReaction(socket.data.user, data);
    });

    socket.on("delete_message", async (data) => {
      void socketService.handleDeleteMessage(socket.data.user, data);
    });

    socket.on("edit_message", async (data) => {
      void socketService.handleEditMessage(socket.data.user, data);
    });

    // E2EE Key exchange setup
    socket.on("store_public_bundle", async (_bundleData, ack) => {
      // TODO: E2EE Key storage logic
      if (ack) ack({ status: "ok" });
    });

    // Typing Indicators
    socket.on("typing_start", (data) => {
      void socketService.handleTyping(socket.data.user, data, true);
    });

    socket.on("typing_stop", (data) => {
      void socketService.handleTyping(socket.data.user, data, false);
    });

    socket.on("read_chat", async (data) => {
      try {
        await socketService.handleMarkAsRead(socket.data.user.id, data.chatId);
      } catch (err) {
        console.error(`[SocketController] Error marking chat as read for user ${socket.data.user.id}:`, err);
      }
    });

    socket.on("active_chat", async (data) => {
      try {
        await redisPresenceService.setActiveChat(socket.data.user.id, data.chatId);
      } catch (err) {
        console.error(`[SocketController] Error setting active chat for user ${socket.data.user.id}:`, err);
      }
    });

    socket.on("disconnect", async () => {
      try {
        await redisPresenceService.setActiveChat(socket.data.user.id, null);
      } catch (err) {
        console.error(`[SocketController] Error clearing active chat on disconnect:`, err);
      }
    });
  });
};
