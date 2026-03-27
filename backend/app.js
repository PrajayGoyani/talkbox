import 'dotenv/config';
import path from 'path';
import express from 'express';
import { connectDB } from './src/config/db.js';
import { NODE_ENV, PORT } from './src/config/env.js';

import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import chatRoutes from './src/routes/chat.routes.js';
import { AppError } from './src/utils/AppError.js';
import { error as errorResponse } from './src/utils/response.js';
import cookieParser from 'cookie-parser';
import http from 'http';
import cors from 'cors';
import { configureSocketServer } from './src/controllers/socket.controller.js';

const app = express();
const server = http.createServer(app);

// TODO: add helmet middleware, when its a right time

// Define allowed origins
const allowedOrigins = ['http://localhost:5173'];

const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
    credentials: true // Set to true if you handle cookies/credentials
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(path.dirname('public'))));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

// 404 Not Found handler
app.use((req, res, next) => {
    const err = errorResponse('ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.path}`);
    if (NODE_ENV === 'development') {
        console.log(err);
    }
    res.status(404).json(err);
});

// Global error handler
app.use((err, req, res, next) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
        return;
    }

    let message = err.message || 'Internal Server Error';
    if (NODE_ENV !== 'development') {
        message = 'Internal Server Error';
    }
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message,
    });
});

async function configureSocket() {
    configureSocketServer(server);
}

import ChatModel from './src/models/chat.model.js';
import MessageModel from './src/models/message.model.js';

async function startJobs() {
    // Basic interval job every 24 hours to enforce retention policies
    setInterval(async () => {
        try {
            console.log('Running background retention jobs...');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

            await MessageModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

            // Note: In a real system, messages linked to these chats might also need explicit deletion 
            // if not handled by cascade or lifecycle hooks, but for now we delete chats explicitly.
            const chatsToDelete = await ChatModel.find({
                isDeleted: true,
                deletedAt: { $lt: fourteenDaysAgo }
            });

            for (const chat of chatsToDelete) {
                await MessageModel.deleteMany({ chatId: chat._id });
                await ChatModel.deleteOne({ _id: chat._id });
            }
            console.log('Background jobs complete.');
        } catch (error) {
            console.error('Error during background jobs:', error);
        }
    }, 24 * 60 * 60 * 1000);
}

function startServer() {
    server.listen(PORT, () => {
        console.log(`Server is running on localhost:${PORT}`);
    });
}

async function bootstrap() {
    await connectDB();
    await configureSocket();
    await startJobs();
    startServer();
}

bootstrap();