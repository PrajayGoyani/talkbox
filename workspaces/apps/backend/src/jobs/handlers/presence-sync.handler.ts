import User from "@models/user.model";
import * as Sentry from "@sentry/bun";
import { redisPresenceService } from "@services/infra/redis.service";

/**
 * Syncs user presence (lastSeen) from Redis queue to MongoDB.
 * Processes in batches to ensure scalability.
 */
export const presenceSyncHandler = async () => {
  const BATCH_SIZE = 1000;
  const MAX_BATCHES_PER_RUN = 50;
  let batchesProcessed = 0;
  let totalSynced = 0;

  for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
    let userIds: string[] = [];

    try {
      userIds = await redisPresenceService.popSyncQueue(BATCH_SIZE);

      if (!userIds || userIds.length === 0) {
        break;
      }

      const lastSeenMap = await redisPresenceService.getLastSeenBatched(userIds);

      const bulkOps: { updateOne: { filter: { _id: string }; update: { $set: { lastSeen: Date } } } }[] = [];
      for (const [userId, lastSeen] of lastSeenMap) {
        bulkOps.push({
          updateOne: {
            filter: { _id: userId },
            update: { $set: { lastSeen } },
          },
        });
      }

      if (bulkOps.length > 0) {
        await User.bulkWrite(bulkOps as any);
        totalSynced += bulkOps.length;
      }

      batchesProcessed++;

      // Stop if we reached the head of the queue
      if (userIds.length < BATCH_SIZE) {
        break;
      }
    } catch (err) {
      console.error(`[PresenceSync] Batch sync failed:`, err);

      // Re-queue user IDs that failed to sync to ensure eventual consistency
      if (userIds && userIds.length > 0) {
        try {
          await redisPresenceService.queuePresenceSyncBatched(userIds);
        } catch (inner) {
          console.error("[PresenceSync] Crit: Re-queue failed", inner);
          Sentry.captureException(inner, { extra: { userIds, originalError: err } });
        }
      }

      // Stop iteration on error to prevent cascading failures
      break;
    }
  }

  if (totalSynced > 0) {
    console.log(`[PresenceSync] Synced ${totalSynced} user(s) across ${batchesProcessed} batches.`);
  }

  // Monitor queue health for alerts
  try {
    const remaining = await redisPresenceService.getSyncQueueCount();
    if (remaining > 50000) {
      Sentry.captureMessage("[PresenceSync] queue growing too fast", {
        level: "warning",
        extra: { remaining },
      });
    }
  } catch {
    // Fail-open for health check
  }
};
