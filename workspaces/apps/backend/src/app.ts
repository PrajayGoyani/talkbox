/**
 * Optimized Child Processes (Bun.spawn)
 * If we ever need to run external tools (like FFmpeg for media processing),
 * Bun.spawn is much more memory-efficient and faster than Node's child_process.spawn.
 */
import { initEventListeners } from "@bootstrap/events/events";
import { registry } from "@bootstrap/registry/registry";
import {
  initializeErrorHandlers,
  initializeExtensions,
  initializeMiddlewares,
  initializeStatic,
} from "@bootstrap/server/express";
import { initSocketIO } from "@bootstrap/server/socket";
import { PORT } from "@config/env";
import { registerRoutes } from "@routes/routes";
import express from "express";
import http from "http";

import { TypedIO } from "@/types/socket.types";

export const app = express();
export const server = http.createServer(app);
export let io: TypedIO;

export async function configureSocket() {
  io = initSocketIO(server);
  registry.socketController.configure(io);
}

export function startServer() {
  // Note: the order must be: extensions -> static -> middlewares -> routes -> error handlers
  initializeExtensions();
  initEventListeners();
  initializeStatic();
  initializeMiddlewares();
  registerRoutes();
  initializeErrorHandlers();

  server.listen(PORT, () => {});

  return server;
}
