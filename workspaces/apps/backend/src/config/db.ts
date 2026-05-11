import { DB_RETRY_ATTEMPTS, DB_RETRY_DELAY_MS, MONGO_URI } from "@config/env";
import mongoose from "mongoose";
import { setServers } from "node:dns/promises";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectDB(retryAttempts: number = DB_RETRY_ATTEMPTS) {
  // windows specific hack
  if (process.platform === "win32") {
    try {
      await setServers(["1.1.1.1", "8.8.8.8"]); // for mongodb connection issues
    } catch (e) {
      console.warn("Warning: Could not set DNS servers:", e);
    }
  }

  let attempt = 0;
  while (attempt < retryAttempts) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("Connected to MongoDB");
      return;
    } catch (error) {
      attempt++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (attempt >= retryAttempts) {
        console.error(`Fatal: Could not connect to MongoDB after ${attempt} attempts:`, errorMessage);
        process.exit(1);
      }

      const backoffDelay = DB_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `Warning: MongoDB connection attempt ${attempt} failed. Retrying in ${backoffDelay}ms... Error:`,
        errorMessage,
      );
      await delay(backoffDelay);
    }
  }
}
