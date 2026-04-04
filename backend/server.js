import 'dotenv/config';
import { setServers } from "node:dns/promises";
import { connectDB } from "./src/config/db.js";
import { startJobs } from './src/jobs/jobs.js'; // avoided using generic names here.
import { configureSocket, startServer } from "./src/app.js";

// windows specific hack
if (process.platform === 'win32') {
    setServers(["1.1.1.1", "8.8.8.8"]);  // for mongodb connection issues
    // nodemon fix
    process.stdout.on('error', (err) => {
        if (err.code === "EPIPE") process.exit(0);
    });
}

async function bootstrap() {
    await connectDB();
    await configureSocket();
    await startJobs();
    startServer();
}

bootstrap();