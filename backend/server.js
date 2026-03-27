import 'dotenv/config';
import { connectDB } from "./src/config/db.js";
import { startJobs } from './src/jobs/index.js';
import { configureSocket, startServer } from "./src/app.js";


async function bootstrap() {
    await connectDB();
    await configureSocket();
    await startJobs();
    startServer();
}

bootstrap();