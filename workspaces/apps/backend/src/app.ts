import { initEventListeners } from "@bootstrap/events";
import {
  initializeErrorHandlers,
  initializeExtensions,
  initializeMiddlewares,
  initializeStatic,
} from "@bootstrap/handler";
import { PORT } from "@config/env";
import { initSocketIO } from "@bootstrap/socket";
import { configureSocketServer } from "@controllers/socket.controller";
import { registerRoutes } from "@routes/routes";
import express from "express";
import http from "http";

export const app = express();
export const server = http.createServer(app);

export async function configureSocket() {
  const io = initSocketIO(server);
  configureSocketServer(io);
}

export function startServer() {
  // Note: the order must be: extensions -> static -> middlewares -> routes -> error handlers
  initializeExtensions();
  initEventListeners();
  initializeStatic();
  initializeMiddlewares();
  registerRoutes();
  initializeErrorHandlers();
  server.listen(PORT, () => {
    console.log(`Server is running on localhost:${PORT}`);
  });
  return server;
}
