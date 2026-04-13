import "dotenv/config";
import mongoose from "mongoose";
import { setServers } from "node:dns/promises";

import { configureSocket, startServer } from "./src/app";
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
    server.close(() => {
      console.log("HTTP server closed.");
    });
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Fatal: Bootstrap failed:", err);
  process.exit(1);
});
