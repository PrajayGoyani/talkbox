import { MONGO_URI } from "@config/env";
import mongoose from "mongoose";

export async function connectDB() {
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
