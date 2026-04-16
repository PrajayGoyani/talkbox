import "dotenv/config";
import mongoose from "mongoose";
import { setServers } from "node:dns/promises";

import { configureSocket, startServer } from "./src/app";
import { stopAgenda } from "./src/config/agenda";
import { connectDB } from "./src/config/db";
import { startJobs } from "./src/jobs/jobs"; // avoided using generic names here.

// windows specific hack
if (process.platform === "win32") {
  setServers(["1.1.1.1", "8.8.8.8"]); // for mongodb connection issues
}

async function bootstrap() {
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
