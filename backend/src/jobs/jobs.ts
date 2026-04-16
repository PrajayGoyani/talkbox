import { NODE_ENV } from "../config/env";
import ChatModel from "../models/chat.model";
import MessageModel from "../models/message.model";
import NotificationModel from "../models/notification.model";

async function runRetentionCleanup() {
  try {
    console.log("Running background retention jobs...");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // 1. Purge messages older than 30 days
    await MessageModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    // 2. Purge notifications
    // Delete already read ones after 14 days
    await NotificationModel.deleteMany({
      isRead: true,
      createdAt: { $lt: fourteenDaysAgo },
    });
    // Delete all others after 30 days
    await NotificationModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });


    const chatsToDelete = await ChatModel.find({
      isDeleted: true,
      deletedAt: { $lt: fourteenDaysAgo },
    }).select("_id");

    const chatIds = chatsToDelete.map((c) => c._id);

    if (chatIds.length > 0) {
      const msgResult = await MessageModel.deleteMany({ chatId: { $in: chatIds } });
      const chatResult = await ChatModel.deleteMany({ _id: { $in: chatIds } });
      console.log(`Deleted ${msgResult.deletedCount} messages and ${chatResult.deletedCount} chats.`);
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
