require('dotenv').config()
const path = require('path');
const express = require('express');
const app = express();

const { connectDB } = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const chatRoutes = require('./src/routes/chat.routes');

app.use(express.json());

// app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

function startServer() {
    const PORT = process.env.PORT;
    app.listen(PORT, () => {
        console.log(`Server is running on localhost:${PORT}`);
    })
}

async function bootstrap() {
    connectDB();
    startServer();
}

bootstrap();