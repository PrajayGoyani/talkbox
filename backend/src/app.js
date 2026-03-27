import express from 'express';
import { PORT } from './config/env.js';

import { registerRoutes } from './routes/index.js';
import http from 'http';
import { initializeMiddlewares, initializeErrorHandlers } from './bootstrap/handler.js';
import { configureSocketServer } from './controllers/socket.controller.js';

export const app = express();
const server = http.createServer(app);

export async function configureSocket() {
    configureSocketServer(server);
}

export function startServer() {
    initializeMiddlewares();
    registerRoutes();
    initializeErrorHandlers();
    server.listen(PORT, () => {
        console.log(`Server is running on localhost:${PORT}`);
    });
}