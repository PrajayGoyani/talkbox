import { connectDB } from "@config/db";
import { startJobs } from "@jobs/jobs";

import { configureSocket, startServer } from "@/app";
import { setupGracefulShutdown } from "@/bootstrap/handler";

export async function bootstrap() {
  await connectDB();
  await configureSocket();
  await startJobs();
  startServer();
  setupGracefulShutdown();
}

bootstrap().catch((err) => {
  console.error("Fatal: Bootstrap failed:", err);
  process.exit(1);
});
