import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import chatRoutes from './chat.routes.js';
import messageRoutes from './message.routes.js';
import { app } from '../app.js';

// define route endpoints
export function registerRoutes() {
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/message', messageRoutes);
}