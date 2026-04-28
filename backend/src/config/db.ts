import { MONGO_URI } from "@config/env";
import mongoose from "mongoose";
import { setServers } from "node:dns/promises";

export async function connectDB() {
  // windows specific hack
  if (process.platform === "win32") {
    setServers(["1.1.1.1", "8.8.8.8"]); // for mongodb connection issues
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal: Could not connect to MongoDB:", error.message);
    } else {
      console.error("Fatal: Could not connect to MongoDB:", error);
    }
    process.exit(1);
  }
}
