import mongoose from "mongoose";

import { chatLockdownService } from "../services/chat-lockdown.service.js";
import { MONGO_URI } from "./env.js";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
    await chatLockdownService.hydrate();
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal: Could not connect to MongoDB:", error.message);
    } else {
      console.error("Fatal: Could not connect to MongoDB:", error);
    }
    process.exit(1);
  }
}
