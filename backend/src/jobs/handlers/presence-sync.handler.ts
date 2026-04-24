import User from "@models/user.model";
import * as Sentry from "@sentry/node";
import { redisService } from "@services/redis.service";

export const presenceSyncHandler = async () => {
  const BATCH_SIZE = 1000;
  const MAX_BATCHES_PER_RUN = 50;
  let batchesProcessed = 0;
  let totalSynced = 0;

  while (batchesProcessed < MAX_BATCHES_PER_RUN) {
    let userIds: string[] = [];

    try {
      userIds = await redisService.popSyncQueue(BATCH_SIZE);
      if (userIds.length === 0) break;

      const lastSeenMap = await redisService.getLastSeenBatched(userIds);

      const bulkOps = Array.from(lastSeenMap.entries()).map(([userId, lastSeen]) => ({
        updateOne: {
          filter: { _id: userId },
          update: { $set: { lastSeen } },
        },
      }));

      if (bulkOps.length > 0) {
        await User.bulkWrite(bulkOps as any);
        totalSynced += bulkOps.length;
      }

      batchesProcessed++;

      if (userIds.length < BATCH_SIZE) break;
    } catch (err) {
      console.error(`[PresenceSync] Batch sync failed:`, err);
      try {
        if (userIds.length > 0) {
          await redisService.queuePresenceSyncBatched(userIds);
        }
      } catch (inner) {
        console.error("[PresenceSync] Crit: Re-queue failed", inner);
      }
      break; 
    }
  }

  if (totalSynced > 0) {
    console.log(`[PresenceSync] Synced ${totalSynced} across ${batchesProcessed} batches.`);
  }

  try {
    const remaining = await redisService.getSyncQueueCount();
    if (remaining > 50000) {
      Sentry.captureMessage("[PresenceSync] queue growing too fast", { level: "warning" });
    }
  } catch (err) {}
};
