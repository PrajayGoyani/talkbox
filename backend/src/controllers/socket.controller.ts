import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import { ALLOWED_ORIGINS, JWT_SECRET_KEY, NODE_ENV } from "../config/env";
import UserModel from "../models/user.model";
import { chatService } from "../services/chat.service";
import { socketService } from "../services/socket.service";
import { AppError } from "../utils/AppError";

export const configureSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  socketService.init(io);
  chatService.setIO(io);

  // Chat Security Auditor: Authenticate socket connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(AppError.unauthorized("Socket authentication error: Token required."));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY);
      const user = await UserModel.findById((decoded as any).id);
      
      if (!user) {
        return next(AppError.unauthorized("User not found"));
      }
      
      // Attach verified user ID to the socket
      socket.data.user = { 
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
      };
      next();
    } catch (error) {
      if (NODE_ENV === "development") {
        console.error(error);
      }
      return next(AppError.unauthorized("Socket authentication error: Invalid Token."));
    }
  });

  io.on("connection", (socket) => {
    socketService.handleConnection(socket);

    socket.on("send_message", async (data, ack) => {
      console.log(`[SocketController] send_message received from user ${socket.data.user.id}:`, data);
      try {
        // Ensure userId is never trusted from the client payload without server-side validation.
        // we use socket.data.user obj
        const message = await socketService.saveAndDeliverMessage(socket.data.user, data);
        if (ack) ack({ status: "ok", message });
      } catch (err) {
        if (ack) ack({ status: "error", error: (err as Error).message });
      }
    });

     socket.on("react_message", async (data) => {
      socketService.handleReaction(socket.data.user.id, data);
    });

    socket.on("delete_message", async (data) => {
      socketService.handleDeleteMessage(socket.data.user.id, data);
    });

    // E2EE Key exchange setup
    socket.on("store_public_bundle", async (bundleData, ack) => {
      // TODO: E2EE Key storage logic
      if (ack) ack({ status: "ok" });
    });

    // Typing Indicators
    socket.on("typing_start", (data) => {
      socketService.handleTyping(socket.data.user.id, data, true);
    });

    socket.on("typing_stop", (data) => {
      socketService.handleTyping(socket.data.user.id, data, false);
    });
  });

  return io;
};
