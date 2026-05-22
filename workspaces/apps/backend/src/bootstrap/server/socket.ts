import { registry } from "@bootstrap/registry/registry";
import { ALLOWED_ORIGINS } from "@config/env";
import { baseService } from "@services/infra/redis.service";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server as HttpServer } from "http";
import { Server } from "socket.io";

import { TypedIO } from "@/types/socket.types";

/**
 * Initializes the Socket.io server with CORS and Redis adapter (if available).
 */
export const initSocketIO = (server: HttpServer): TypedIO => {
  const io: TypedIO = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Enable multi-instance support via Redis Adapter
  if (baseService.adapterPubClient && baseService.adapterSubClient) {
    const pubClient = baseService.adapterPubClient;
    const subClient = baseService.adapterSubClient;
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[SocketBootstrap] Redis adapter configured for distributed events (isolated clients).");
  }

  registry.socketService.init(io);

  return io;
};
