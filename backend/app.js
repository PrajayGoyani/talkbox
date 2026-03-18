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

const app = express();

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
    // TODO: implement socket initialization
}

async function startJobs() {
    // TODO: implement jobs
}

function startServer() {
    app.listen(PORT, () => {
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