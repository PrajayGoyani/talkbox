import Chat, { IChatModel } from "@models/chat.model";
import { redisService } from "@services/redis.service";

/**
 * Distributed lockdown logic for deleted chats.
 * Prevents messages from being sent to deleted chats by checking a Redis Set.
 * This avoids the memory bottleneck of a local in-memory Set.
 */
class ChatLockdownService {
  public Chat: IChatModel;

  constructor(chatModel: IChatModel) {
    this.Chat = chatModel;
  }

  /**
   * No-op retained for boot compatibility. 
   * Distributed sync is now handled directly via Redis SISMEMBER.
   */
  async init() {
    return Promise.resolve();
  }

  /**
   * No longer needed as Redis is the source of truth and state is persistent.
   */
  async hydrate() {
    return Promise.resolve();
  }

  async lockdownChat(chatId: string | import("mongodb").ObjectId) {
    const id = chatId.toString();
    await redisService.lockChat(id);
  }

  async isChatDeleted(chatId: string | import("mongodb").ObjectId): Promise<boolean> {
    return await redisService.isChatLocked(chatId.toString());
  }

  async unlockChat(chatId: string | import("mongodb").ObjectId) {
    const id = chatId.toString();
    await redisService.unlockChat(id);
  }
}

export const chatLockdownService = new ChatLockdownService(Chat);
