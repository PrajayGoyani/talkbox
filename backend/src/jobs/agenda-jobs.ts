import { getAgenda } from "../config/agenda";
import ChatModel from "../models/chat.model";
import MessageModel from "../models/message.model";
import NotificationModel from "../models/notification.model";

export const JOBS = {
  DATA_RETENTION_CLEANUP: "data-retention-cleanup",
};

export function defineJobs() {
  const agenda = getAgenda();

  agenda.define(JOBS.DATA_RETENTION_CLEANUP, async () => {
    try {
      console.log("Running background retention jobs (Agenda)...");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // 1. Purge messages older than 30 days
      const msgPurgeResult = await MessageModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

      // 2. Purge notifications
      // Delete already read ones after 14 days
      await NotificationModel.deleteMany({
        isRead: true,
        createdAt: { $lt: fourteenDaysAgo },
      });
      // Delete all others after 30 days
      await NotificationModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

      // 3. Purge deleted chats
      const chatsToDelete = await ChatModel.find({
        isDeleted: true,
        deletedAt: { $lt: fourteenDaysAgo },
      }).select("_id");

      const chatIds = chatsToDelete.map((c) => c._id);

      if (chatIds.length > 0) {
        await MessageModel.deleteMany({ chatId: { $in: chatIds } });
        await ChatModel.deleteMany({ _id: { $in: chatIds } });
      }

      console.log(`Background retention jobs complete. Cleaned up messages older than ${thirtyDaysAgo.toISOString()}.`);
    } catch (error) {
      console.error("Error during background jobs:", error);
    }
  });
}
