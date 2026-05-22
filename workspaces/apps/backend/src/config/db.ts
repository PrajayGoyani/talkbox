import { DB_RETRY_ATTEMPTS, DB_RETRY_DELAY_MS, MONGO_URI } from "@config/env";
import { logger } from "@utils/logger";
import mongoose from "mongoose";
import { setServers } from "node:dns/promises";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectDB(retryAttempts: number = DB_RETRY_ATTEMPTS) {
  // windows specific hack
  if (process.platform === "win32") {
    try {
      await setServers(["1.1.1.1", "8.8.8.8"]); // for mongodb connection issues
    } catch (e) {
      logger.warn("Could not set DNS servers", e);
    }
  }

  let attempt = 0;
  while (attempt < retryAttempts) {
    try {
      await mongoose.connect(MONGO_URI);
      logger.info("Connected to MongoDB");
      return;
    } catch (error) {
      attempt++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (attempt >= retryAttempts) {
        logger.error(`Fatal: Could not connect to MongoDB after ${attempt} attempts`, { error: errorMessage });
        process.exit(1);
      }

      const backoffDelay = DB_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(`MongoDB connection attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`, {
        error: errorMessage,
      });
      await delay(backoffDelay);
    }
  }
}
