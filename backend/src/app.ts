import express from "express";
import http from "http";

import {
  initializeMiddlewares,
  initializeErrorHandlers,
  initializeExtensions,
  initializeStatic,
} from "./bootstrap/handler";
import { PORT } from "./config/env";
import { configureSocketServer } from "./controllers/socket.controller";
import { registerRoutes } from "./routes/routes";

export const app = express();
const server = http.createServer(app);

export async function configureSocket() {
  configureSocketServer(server);
}

export function startServer() {
  // Note: the order must be: extensions -> static -> middlewares -> routes -> error handlers
  initializeExtensions();
  initializeStatic();
  initializeMiddlewares();
  registerRoutes();
  initializeErrorHandlers();
  server.listen(PORT, () => {
    console.log(`Server is running on localhost:${PORT}`);
  });
  return server;
}
