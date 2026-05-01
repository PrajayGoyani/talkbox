import { redisService } from "@services/redis.service";
import { UserRepository } from "@repositories/user.repository";

import { TypedIO, TypedSocket } from "@/types/socket.types";

export class PresenceService {
  constructor(
    private ioProvider: () => TypedIO | null,
    private userRepo: UserRepository,
  ) {}

  // setupStatusWatchers and cleanupStatusWatchers removed.
  // Watcher state is now managed via Socket.io Rooms for scalability.

  async emitPartnersStatus(userId: string, socket: TypedSocket, partnerIds: Set<string>) {
    try {
      const partnerIdsArr = Array.from(partnerIds);
      const onlinePartners = await redisService.getOnlineUsers(partnerIdsArr);
      const lastSeenMap = await redisService.getLastSeenBatched(partnerIdsArr);

      const missingFromRedisIds = partnerIdsArr.filter((id) => !onlinePartners.has(id) && !lastSeenMap.has(id));

      if (missingFromRedisIds.length > 0) {
        const offlineUsers = await this.userRepo.findByIds(missingFromRedisIds, "lastSeen");
        offlineUsers.forEach((u: any) => {
          if (u.lastSeen) lastSeenMap.set(u._id.toString(), u.lastSeen);
        });
      }

      const batch = partnerIdsArr.map((partnerId) => {
        const isOnline = onlinePartners.has(partnerId);
        return {
          userId: partnerId,
          isOnline,
          lastSeen: isOnline ? null : lastSeenMap.get(partnerId) || null,
        };
      });

      if (batch.length > 0) {
        socket.emit("user_status_batch", batch);
      }
    } catch (err) {
      console.error("[PresenceService] Error emitting partners status:", err);
    }
  }

  async notifyStatusChange(userId: string, isOnline: boolean) {
    try {
      if (isOnline) {
        await redisService.setUserOnline(userId);
      } else {
        const lastSeen = new Date();
        await redisService.setUserOffline(userId, lastSeen);
        await redisService.queuePresenceSync(userId);
        // NOTE: findByIdAndUpdate(userId, { lastSeen }) removed for scalability.
        // Persistence to DB is now handled via periodic background sync.
        // Cold storage in MongoDB might be slightly stale if Redis is cleared.
      }
    } catch (err) {
      console.error("[PresenceService] Error notifying status change:", err);
    }
  }
}
