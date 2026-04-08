import express from "express";
import { PORT } from "./config/env.js";

import { registerRoutes } from "./routes/routes.js";
import http from "http";
import {
  initializeMiddlewares,
  initializeErrorHandlers,
  initializeExtensions,
  initializeStatic,
} from "./bootstrap/handler.js";
import { configureSocketServer } from "./controllers/socket.controller.js";

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
}
