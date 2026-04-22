import { Types } from "mongoose";

import { RETENTION_DELETED_CHAT_DAYS, RETENTION_MESSAGE_DAYS, RETENTION_NOTIFICATION_DAYS } from "../../config/env";
import ChatModel from "../../models/chat.model";
import MessageModel from "../../models/message.model";
import NotificationModel from "../../models/notification.model";
import UserModel from "../../models/user.model";

/**
 * @risk Medium - Background Jobs
 * This handler uses complex plan-aware logic with MongoDB queries that could impact performance
 * as the database grows. Monitor Agenda job logs after deployment to ensure:
 * 1. 365-day purge (Free-to-Free chats)
 * 2. 30-day notification purge
 * are running within reasonable time limits.
 */
export const retentionHandler = async () => {
  try {
    console.log("Running background retention jobs (Agenda)...");

    // Calculate dates
    const retentionThreshold = new Date();
    retentionThreshold.setDate(retentionThreshold.getDate() - RETENTION_MESSAGE_DAYS);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - RETENTION_DELETED_CHAT_DAYS);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - RETENTION_NOTIFICATION_DAYS); // Using constant instead of hardcoded 30

    // Optimization: Use ObjectId timestamps for indexed cleanup without adding new indexes.
    const retentionThresholdId = Types.ObjectId.createFromTime(Math.floor(retentionThreshold.getTime() / 1000));
    const fourteenDaysAgoId = Types.ObjectId.createFromTime(Math.floor(fourteenDaysAgo.getTime() / 1000));
    const thirtyDaysAgoId = Types.ObjectId.createFromTime(Math.floor(thirtyDaysAgo.getTime() / 1000));

    // 1. Purge messages older than 365 days (Plan-Aware)
    // Rule: Only purge messages if BOTH participants are currently on the Free plan.
    // Pro users get "Unlimited History".
    const freeUsers = await UserModel.find({ plan: "free" }).select("_id");
    const freeUserIds = freeUsers.map((u) => u._id);

    // Find chats where BOTH userA and userB are Free users
    const freeChats = await ChatModel.find({
      userA: { $in: freeUserIds },
      userB: { $in: freeUserIds },
    }).select("_id");

    const freeChatIds = freeChats.map((c) => c._id);

    if (freeChatIds.length > 0) {
      const { deletedCount } = await MessageModel.deleteMany({
        chatId: { $in: freeChatIds },
        _id: { $lt: retentionThresholdId },
      });
      if (deletedCount > 0) {
        console.log(
          `[Retention] Purged ${deletedCount} messages older than ${RETENTION_MESSAGE_DAYS} days from Free-to-Free chats.`,
        );
      }
    }

    // 2. Purge notifications
    // Delete already read ones after 14 days
    await NotificationModel.deleteMany({
      isRead: true,
      _id: { $lt: fourteenDaysAgoId },
    });
    // Delete all others after 30 days
    await NotificationModel.deleteMany({ _id: { $lt: thirtyDaysAgoId } });

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

    console.log(
      `Background retention jobs complete. (Policy: Free messages ${RETENTION_MESSAGE_DAYS}d, Notifications 30d, Deleted chats 14d)`,
    );
  } catch (error) {
    console.error("Error during background jobs:", error);
  }
};
