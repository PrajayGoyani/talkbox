import {
  RETENTION_BATCH_SIZE,
  RETENTION_CONCURRENCY,
  RETENTION_DELETED_CHAT_DAYS,
  RETENTION_MESSAGE_DAYS,
  RETENTION_NOTIFICATION_DAYS,
} from "@config/env";
import ChatModel from "@models/chat.model";
import MessageModel from "@models/message.model";
import NotificationModel from "@models/notification.model";
import { Types } from "mongoose";
import { logger } from "@utils/logger";

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
    logger.info("Running background retention jobs (Agenda)...");

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
    // Rule: Only purge messages if ALL participants are currently on the Free plan.
    // Pro users get "Unlimited History".

    // Use denormalized flag with index for O(1) evaluation (Efficiency fix)
    const freeChatCursor = ChatModel.find({
      isFreeTierOnly: true,
      isDeleted: false,
    })
      .select("_id")
      .lean()
      .cursor();

    const CHUNK_SIZE = RETENTION_BATCH_SIZE;
    const CONCURRENCY = RETENTION_CONCURRENCY;
    let deletedCountTotal = 0;
    let chatChunk: Types.ObjectId[] = [];
    let deletionPromises: Promise<any>[] = [];

    for await (const doc of freeChatCursor) {
      chatChunk.push(doc._id);

      if (chatChunk.length >= CHUNK_SIZE) {
        const currentBatch = [...chatChunk];
        deletionPromises.push(
          MessageModel.deleteMany({
            chatId: { $in: currentBatch },
            _id: { $lt: retentionThresholdId },
          }).then((res) => {
            deletedCountTotal += res.deletedCount;
          }),
        );
        chatChunk = [];

        if (deletionPromises.length >= CONCURRENCY) {
          await Promise.all(deletionPromises);
          deletionPromises = [];
        }
      }
    }

    if (chatChunk.length > 0) {
      const res = await MessageModel.deleteMany({
        chatId: { $in: chatChunk },
        _id: { $lt: retentionThresholdId },
      });
      deletedCountTotal += res.deletedCount;
    }
    await Promise.all(deletionPromises);

    if (deletedCountTotal > 0) {
      logger.info(
        `[Retention] Purged ${deletedCountTotal} messages older than ${RETENTION_MESSAGE_DAYS} days from Free-to-Free chats.`,
      );
    }

    // 1.5. Purge messages based on custom per-chat retention settings
    const customRetentionChats = await ChatModel.find({
      retentionPeriod: { $ne: null, $gt: 0 },
      isDeleted: false,
    })
      .select("_id retentionPeriod")
      .lean();

    if (customRetentionChats.length > 0) {
      const chatsByPeriod = new Map<number, Types.ObjectId[]>();
      for (const chat of customRetentionChats) {
        const period = chat.retentionPeriod!;
        if (!chatsByPeriod.has(period)) {
          chatsByPeriod.set(period, []);
        }
        chatsByPeriod.get(period)!.push(chat._id);
      }

      for (const [periodMonths, chatIds] of chatsByPeriod.entries()) {
        const customThreshold = new Date();
        customThreshold.setMonth(customThreshold.getMonth() - periodMonths);

        const customThresholdId = Types.ObjectId.createFromTime(Math.floor(customThreshold.getTime() / 1000));

        const res = await MessageModel.deleteMany({
          chatId: { $in: chatIds },
          _id: { $lt: customThresholdId },
        });

        if (res.deletedCount > 0) {
          logger.info(
            `[Retention] Purged ${res.deletedCount} messages older than ${periodMonths} months based on custom chat settings.`,
          );
        }
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
    const deletedChatsCursor = ChatModel.find({
      isDeleted: true,
      deletedAt: { $lt: fourteenDaysAgo },
    })
      .select("_id")
      .lean()
      .cursor();

    let deletedChatsChunk: Types.ObjectId[] = [];
    let cleanupPromises: Promise<any>[] = [];

    for await (const doc of deletedChatsCursor) {
      deletedChatsChunk.push(doc._id);

      if (deletedChatsChunk.length >= CHUNK_SIZE) {
        const currentBatch = [...deletedChatsChunk];
        cleanupPromises.push(
          Promise.all([
            MessageModel.deleteMany({ chatId: { $in: currentBatch } }),
            ChatModel.deleteMany({ _id: { $in: currentBatch } }),
          ]),
        );
        deletedChatsChunk = [];

        if (cleanupPromises.length >= CONCURRENCY) {
          await Promise.all(cleanupPromises);
          cleanupPromises = [];
        }
      }
    }

    if (deletedChatsChunk.length > 0) {
      await MessageModel.deleteMany({ chatId: { $in: deletedChatsChunk } });
      await ChatModel.deleteMany({ _id: { $in: deletedChatsChunk } });
    }
    await Promise.all(cleanupPromises);

    logger.info(
      `Background retention jobs complete. (Policy: Free messages ${RETENTION_MESSAGE_DAYS}d, Notifications 30d, Deleted chats 14d)`,
    );
  } catch (error) {
    logger.error("Error during background jobs", {
      error: error instanceof Error ? error.stack : String(error),
    });
  }
};
