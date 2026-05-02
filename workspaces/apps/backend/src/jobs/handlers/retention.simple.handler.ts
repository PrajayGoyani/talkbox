import { RETENTION_DELETED_CHAT_DAYS, RETENTION_MESSAGE_DAYS, RETENTION_NOTIFICATION_DAYS } from "@config/env";
import ChatModel from "@models/chat.model";
import MessageModel from "@models/message.model";
import NotificationModel from "@models/notification.model";
import { Types } from "mongoose";

export const retentionHandler = async () => {
  try {
    console.log("Running simplified background retention jobs...");

    // 1. Calculate threshold dates and ObjectIds
    const now = Math.floor(Date.now() / 1000);
    const messageThresholdId = Types.ObjectId.createFromTime(now - RETENTION_MESSAGE_DAYS * 86400);
    const notificationShortThresholdId = Types.ObjectId.createFromTime(now - RETENTION_DELETED_CHAT_DAYS * 86400);
    const notificationLongThresholdId = Types.ObjectId.createFromTime(now - RETENTION_NOTIFICATION_DAYS * 86400);
    const deletedChatThreshold = new Date(Date.now() - RETENTION_DELETED_CHAT_DAYS * 86400);

    // 2. Purge messages from Free-only chats
    const freeChatIds = await ChatModel.find({ isFreeTierOnly: true, isDeleted: false }).distinct("_id");
    const messageResult = await MessageModel.deleteMany({
      chatId: { $in: freeChatIds },
      _id: { $lt: messageThresholdId },
    });

    // 3. Purge notifications
    await NotificationModel.deleteMany({
      $or: [
        { isRead: true, _id: { $lt: notificationShortThresholdId } },
        { _id: { $lt: notificationLongThresholdId } },
      ],
    });

    // 4. Purge deleted chats and their messages
    const deletedChatIds = await ChatModel.find({
      isDeleted: true,
      deletedAt: { $lt: deletedChatThreshold },
    }).distinct("_id");

    await MessageModel.deleteMany({ chatId: { $in: deletedChatIds } });
    await ChatModel.deleteMany({ _id: { $in: deletedChatIds } });

    console.log(`Retention complete. Purged ${messageResult.deletedCount} old messages.`);
  } catch (error) {
    console.error("Retention job failed:", error);
  }
};
