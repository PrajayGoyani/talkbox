import { SUBSCRIPTION_BATCH_SIZE } from "@config/env";
import ChatModel from "@models/chat.model";
import UserModel from "@models/user.model";
import { Types } from "mongoose";

export const subscriptionHandler = async () => {
  try {
    console.log("Running subscription expiry job...");

    const CHUNK_SIZE = SUBSCRIPTION_BATCH_SIZE;

    // 1. Process expired users in chunks using a cursor to keep memory footprint constant
    const expiredUsersCursor = UserModel.find({
      plan: "pro",
      subscriptionExpiresAt: { $lt: new Date() },
    })
      .select("_id")
      .lean()
      .cursor();

    let userIdsBatch: Types.ObjectId[] = [];

    for await (const user of expiredUsersCursor) {
      userIdsBatch.push(user._id);

      if (userIdsBatch.length >= CHUNK_SIZE) {
        await processDowngradeBatch(userIdsBatch, CHUNK_SIZE);
        userIdsBatch = [];
      }
    }

    if (userIdsBatch.length > 0) {
      await processDowngradeBatch(userIdsBatch, CHUNK_SIZE);
    }

    console.log("Subscription expiry job complete.");
  } catch (error) {
    console.error("Error during subscription expiry job:", error);
  }
};

/**
 * Handles downgrading a batch of users and re-evaluating their associated chats.
 * Targeted and batch-optimized per reviewer recommendations.
 */
async function processDowngradeBatch(userIds: Types.ObjectId[], chatBatchSize: number) {
  // 1. Bulk-downgrade this batch of users
  await UserModel.updateMany({ _id: { $in: userIds } }, { $set: { plan: "free", subscriptionExpiresAt: null } });

  console.log(`Downgraded batch of ${userIds.length} users. Re-evaluating affected chats...`);

  // 2. Targeted re-evaluation: only check chats where these specific users are participants
  const cursor = ChatModel.aggregate([
    {
      $match: {
        isFreeTierOnly: false,
        participants: { $in: userIds },
        isDeleted: false,
      },
    },
    { $project: { _id: 1, participants: 1 } }, // Optimization: Shrink docs early to save RAM before $lookup
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: "participants",
        foreignField: "_id",
        pipeline: [{ $match: { plan: "pro" } }, { $limit: 1 }, { $project: { _id: 1 } }],
        as: "proParticipants",
      },
    },
    {
      $match: {
        proParticipants: { $size: 0 },
      },
    },
    { $project: { _id: 1 } },
  ])
    .allowDiskUse(true)
    .cursor();

  let chatIdsBatch: Types.ObjectId[] = [];

  for await (const chat of cursor) {
    chatIdsBatch.push(chat._id);

    if (chatIdsBatch.length >= chatBatchSize) {
      await ChatModel.updateMany({ _id: { $in: chatIdsBatch } }, { $set: { isFreeTierOnly: true } });
      chatIdsBatch = [];
    }
  }

  if (chatIdsBatch.length > 0) {
    await ChatModel.updateMany({ _id: { $in: chatIdsBatch } }, { $set: { isFreeTierOnly: true } });
  }
}
