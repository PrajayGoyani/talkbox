import { UserRepository } from "@repositories/user.repository";
import { redisPresenceService } from "@services/infra/redis.service";

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
      const batch = await this.getPartnersStatusBatch(userId, partnerIds);
      if (batch.length > 0) {
        socket.emit("user_status_batch", batch);
      }
    } catch (err) {
      console.error("[PresenceService] Error emitting partners status:", err);
    }
  }

  /**
   * Fetches the presence status batch for a set of partners.
   * Optimized to minimize Redis and DB hits.
   */
  async getPartnersStatusBatch(userId: string, partnerIds: Set<string>): Promise<any[]> {
    const partnerIdsArr = Array.from(partnerIds);
    if (partnerIdsArr.length === 0) return [];

    const [onlinePartners, lastSeenMap] = await Promise.all([
      redisPresenceService.getOnlineUsers(partnerIdsArr),
      redisPresenceService.getLastSeenBatched(partnerIdsArr),
    ]);

    const missingFromRedisIds = partnerIdsArr.filter((id) => !onlinePartners.has(id) && !lastSeenMap.has(id));

    if (missingFromRedisIds.length > 0) {
      const offlineUsers = await this.userRepo.findByIds(missingFromRedisIds, "lastSeen");
      offlineUsers.forEach((u: any) => {
        if (u.lastSeen) lastSeenMap.set(u._id.toString(), u.lastSeen);
      });
    }

    return partnerIdsArr.map((partnerId) => {
      const isOnline = onlinePartners.has(partnerId);
      return {
        userId: partnerId,
        isOnline,
        lastSeen: isOnline ? null : lastSeenMap.get(partnerId) || null,
      };
    });
  }

  async notifyStatusChange(userId: string, isOnline: boolean) {
    try {
      if (isOnline) {
        await redisPresenceService.setUserOnline(userId);
      } else {
        const lastSeen = new Date();
        await redisPresenceService.setUserOffline(userId, lastSeen);
        await redisPresenceService.queuePresenceSync(userId);
        // NOTE: findByIdAndUpdate(userId, { lastSeen }) removed for scalability.
        // Persistence to DB is now handled via periodic background sync.
        // Cold storage in MongoDB might be slightly stale if Redis is cleared.
      }
    } catch (err) {
      console.error("[PresenceService] Error notifying status change:", err);
    }
  }
}
