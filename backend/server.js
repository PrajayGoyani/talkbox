import 'dotenv/config';
import { connectDB } from "./src/config/db.js";
import { startJobs } from './src/jobs/jobs.js'; // avoided using generic names here.
import { configureSocket, startServer } from "./src/app.js";


async function bootstrap() {
    await connectDB();
    await configureSocket();
    await startJobs();
    startServer();
}

bootstrap();