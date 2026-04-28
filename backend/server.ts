import { stopAgenda } from "@config/agenda";
import { connectDB } from "@config/db";
import { startJobs } from "@jobs/jobs";
import { redisService } from "@services/redis.service";
import mongoose from "mongoose";

import { configureSocket, startServer } from "@/app";

export async function bootstrap() {
  await connectDB();

  await configureSocket();
  await startJobs();
  const server = startServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
      // 1. Stop background jobs
      await stopAgenda();

      // 2. Close HTTP server and all active sockets
      // This will trigger 'disconnect' events on all sockets
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log("HTTP server closed.");
          resolve();
        });
      });

      // 3. Close Redis (used by socket disconnect handlers)
      await redisService.close();

      // 4. Close MongoDB
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
      process.exit(1);
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Fatal: Bootstrap failed:", err);
  process.exit(1);
});
