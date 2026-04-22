import { ALLOWED_ORIGINS, JWT_SECRET_KEY, NODE_ENV } from "@config/env";
import User from "@models/user.model";
import { chatService } from "@services/chat.service";
import { socketService } from "@services/socket.service";
import { AppError } from "@utils/AppError";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import { AuthenticatedSocketUser, JWTPayload, TypedIO, TypedSocket } from "@/types/socket.types";

interface CacheEntry {
  user: AuthenticatedSocketUser;
  expiresAt: number;
}

// TODO(Performance): For future horizontal scalability across multiple WebSocket
// nodes, consider replacing this local in-memory Map with a Redis-backed cache.
// This will allow shared authentication state and prevent redundant DB lookups.
const userCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// Run cleanup periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (value.expiresAt < now) {
      userCache.delete(key);
    }
  }
}, CACHE_TTL_MS).unref();

export const configureSocketServer = (server: import("http").Server | import("https").Server): TypedIO => {
  const io: TypedIO = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  socketService.init(io);
  chatService.setIO(io);

  // Chat Security Auditor: Authenticate socket connection
  io.use(async (socket: TypedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(AppError.unauthorized("Socket authentication error: Token required."));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY) as unknown as JWTPayload;

      // Check cache first to avoid DB hit on reconnects/high churn
      const cached = userCache.get(decoded.id);
      if (cached && cached.expiresAt > Date.now()) {
        socket.data.user = cached.user;
        return next();
      }

      const user = await User.findById(decoded.id);

      if (!user) {
        return next(AppError.unauthorized("User not found"));
      }

      const userData: AuthenticatedSocketUser = {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        plan: user.plan,
      };

      // Set cache for short-lived duration
      userCache.set(decoded.id, {
        user: userData,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      // Attach verified user ID to the socket
      socket.data.user = userData;
      next();
    } catch (error) {
      if (NODE_ENV === "development") {
        console.error(error);
      }
      return next(AppError.unauthorized("Socket authentication error: Invalid Token."));
    }
  });

  io.on("connection", (socket: TypedSocket) => {
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
      socketService.handleReaction(socket.data.user, data);
    });

    socket.on("delete_message", async (data) => {
      socketService.handleDeleteMessage(socket.data.user, data);
    });

    // E2EE Key exchange setup
    socket.on("store_public_bundle", async (_bundleData, ack) => {
      // TODO: E2EE Key storage logic
      if (ack) ack({ status: "ok" });
    });

    // Typing Indicators
    socket.on("typing_start", (data) => {
      socketService.handleTyping(socket.data.user, data, true);
    });

    socket.on("typing_stop", (data) => {
      socketService.handleTyping(socket.data.user, data, false);
    });
  });

  return io;
};
