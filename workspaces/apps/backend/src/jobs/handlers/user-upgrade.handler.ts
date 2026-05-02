import { USER_UPGRADE_BATCH_SIZE, USER_UPGRADE_CONCURRENCY } from "@config/env";
import ChatModel from "@models/chat.model";
import { Job } from "agenda";
import { Types } from "mongoose";

/**
 * Background job to re-evaluate isFreeTierOnly flag for all chats a user belongs to.
 * Triggered when a user upgrades to Pro.
 *
 * Using a background job prevents API latency spikes for heavy users with many chats.
 */
export const userUpgradeChatSyncHandler = async (job: Job) => {
  const { userId } = job.attrs.data as { userId: string };
  const start = Date.now();

  try {
    console.log(`[Job] Syncing chat flags for user upgrade: ${userId}`);

    const CHUNK_SIZE = USER_UPGRADE_BATCH_SIZE;
    const CONCURRENCY = USER_UPGRADE_CONCURRENCY;

    // Use cursor for targeted lookup to handle users with extreme chat counts (Efficiency fix)
    const cursor = ChatModel.find({
      participants: new Types.ObjectId(userId),
      isFreeTierOnly: true,
      isDeleted: false,
    })
      .select("_id")
      .lean()
      .cursor();

    let chatIdsBatch: Types.ObjectId[] = [];
    let updatePromises: Promise<any>[] = [];

    for await (const chat of cursor) {
      chatIdsBatch.push(chat._id);

      if (chatIdsBatch.length >= CHUNK_SIZE) {
        const currentBatch = [...chatIdsBatch];
        updatePromises.push(ChatModel.updateMany({ _id: { $in: currentBatch } }, { $set: { isFreeTierOnly: false } }));
        chatIdsBatch = [];

        if (updatePromises.length >= CONCURRENCY) {
          await Promise.all(updatePromises);
          updatePromises = [];
        }
      }
    }

    if (chatIdsBatch.length > 0) {
      await ChatModel.updateMany({ _id: { $in: chatIdsBatch } }, { $set: { isFreeTierOnly: false } });
    }
    await Promise.all(updatePromises);

    const duration = Date.now() - start;
    console.log(`[Job] Successfully synced chat flags for upgraded user ${userId} in ${duration}ms.`);
  } catch (error) {
    console.error(`[Job] Failed to sync chats for user upgrade ${userId}:`, error);
    throw error; // Re-throw for Agenda retry
  }
};
