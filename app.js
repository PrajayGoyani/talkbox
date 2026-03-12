import 'dotenv/config';
import path from 'path';
import express from 'express';
import { connectDB } from './src/config/db.js';
import { PORT } from './src/config/env.js';

import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import chatRoutes from './src/routes/chat.routes.js';

const app = express();

app.use(express.json());

// // app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(path.dirname('public'))));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

// // Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
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
    configureSocket();
    startJobs();
    startServer();
}

bootstrap();