import { stopAgenda } from "@config/agenda";
import { connectDB } from "@config/db";
import { initSentry } from "@config/sentry";
import { startJobs } from "@jobs/jobs";
import { redisService } from "@services/redis.service";
import mongoose from "mongoose";

import { configureSocket, startServer } from "@/app";

async function bootstrap() {
  initSentry();
  await connectDB();
  await configureSocket();
  await startJobs();
  const server = startServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
      await stopAgenda();

      // Properly await server close
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log("HTTP server closed.");
          resolve();
        });
      });

      await mongoose.connection.close();
      console.log("MongoDB connection closed.");

      // Close Redis connections
      await redisService.close();
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
