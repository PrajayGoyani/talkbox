import { ALLOWED_ORIGINS } from "@config/env";
import { baseService } from "@services/infra/redis.service";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";

import { TypedIO } from "@/types/socket.types";

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
  if (baseService.client && baseService.subClient) {
    const pubClient = baseService.client;
    const subClient = baseService.subClient;
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[SocketBootstrap] Redis adapter configured for distributed events.");
  }

  return io;
};
