import { connectDB } from "@config/db";
import { startJobs } from "@jobs/jobs";

import { configureSocket, startServer } from "@/app";
import { shutdown } from "@/bootstrap/handler";

export async function bootstrap() {
  await connectDB();
  await configureSocket();
  await startJobs();
  startServer();

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Fatal: Bootstrap failed:", err);
  process.exit(1);
});
