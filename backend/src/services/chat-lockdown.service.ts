import { redisService } from "@services/redis.service";

/**
 * Distributed lockdown logic for deleted chats.
 * Prevents messages from being sent to deleted chats by checking a Redis Set.
 * This avoids the memory bottleneck of a local in-memory Set.
 */
class ChatLockdownService {
  async lockdownChat(chatId: string | import("mongodb").ObjectId) {
    const id = chatId.toString();
    await redisService.lockChat(id);
    await redisService.publishCacheInvalidation("chat", id);
  }

  async isChatDeleted(chatId: string | import("mongodb").ObjectId): Promise<boolean> {
    return await redisService.isChatLocked(chatId.toString());
  }

  async unlockChat(chatId: string | import("mongodb").ObjectId) {
    const id = chatId.toString();
    await redisService.unlockChat(id);
    await redisService.publishCacheInvalidation("chat", id);
  }
}

export const chatLockdownService = new ChatLockdownService();
