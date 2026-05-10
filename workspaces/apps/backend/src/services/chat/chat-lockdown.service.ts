import { redisGuardService, redisSessionService } from "@services/infra/redis.service";

/**
 * Distributed lockdown logic for deleted chats.
 * Prevents messages from being sent to deleted chats by checking a Redis Set.
 * This avoids the memory bottleneck of a local in-memory Set.
 */
class ChatLockdownService {
  async lockdownChat(chatId: string | import("mongodb").ObjectId) {
    const id = chatId.toString();
    await redisGuardService.lockChat(id);
    await redisSessionService.publishCacheInvalidation("chat", id);
  }

  async isChatDeleted(chatId: string | import("mongodb").ObjectId): Promise<boolean> {
    return await redisGuardService.isChatLocked(chatId.toString());
  }

  async unlockChat(chatId: string | import("mongodb").ObjectId) {
    const id = chatId.toString();
    await redisGuardService.unlockChat(id);
    await redisSessionService.publishCacheInvalidation("chat", id);
  }
}

export const chatLockdownService = new ChatLockdownService();
