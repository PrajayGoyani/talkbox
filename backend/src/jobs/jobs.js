import { NODE_ENV } from "../config/env.js";
import ChatModel from "../models/chat.model.js";
import MessageModel from "../models/message.model.js";

async function runRetentionCleanup() {
  try {
    console.log("Running background retention jobs...");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    await MessageModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    const chatsToDelete = await ChatModel.find({
      isDeleted: true,
      deletedAt: { $lt: fourteenDaysAgo },
    });

    for (const chat of chatsToDelete) {
      await MessageModel.deleteMany({ chatId: chat._id });
      await ChatModel.deleteOne({ _id: chat._id });
    }
    console.log("Background jobs complete.");
  } catch (error) {
    console.error("Error during background jobs:", error);
  }
}

export async function startJobs() {
  if (NODE_ENV !== "production") {
    console.log("Skipping background jobs in non-production environment.");
    return;
  }

  // Execute immediately on startup
  await runRetentionCleanup();

  // Schedule to run every 24 hours
  setInterval(
    () => {
      runRetentionCleanup().catch((error) => {
        console.error("Unhandled background job error:", error);
      });
    },
    24 * 60 * 60 * 1000,
  );
}

