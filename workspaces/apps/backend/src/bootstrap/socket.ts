import { TypedIO } from "@/types/socket.types";
import { ALLOWED_ORIGINS } from "@config/env";
import { redisService } from "@services/infra/redis.service";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";

/**
 * Initializes the Socket.io server with CORS and Redis adapter (if available).
 */
export const initSocketIO = (server: import("http").Server | import("https").Server): TypedIO => {
  const io: TypedIO = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Enable multi-instance support via Redis Adapter
  if (redisService.client && redisService.subClient) {
    const pubClient = redisService.client;
    const subClient = redisService.subClient;
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[SocketBootstrap] Redis adapter configured for distributed events.");
  }

  return io;
};
