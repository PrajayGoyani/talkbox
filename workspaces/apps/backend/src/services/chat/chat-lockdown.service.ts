import { IRedisGuardService, IRedisSessionService } from "@services/infra/interfaces";
import { ObjectId } from "mongodb";

import { IChatLockdownService } from "./types";

/**
 * Distributed lockdown logic for deleted chats.
 * Prevents messages from being sent to deleted chats by checking a Redis Set.
 * This avoids the memory bottleneck of a local in-memory Set.
 */
export class ChatLockdownService implements IChatLockdownService {
  constructor(
    private redisGuardService: IRedisGuardService,
    private redisSessionService: IRedisSessionService,
  ) {}

  async lockdownChat(chatId: string | ObjectId) {
    const id = chatId.toString();
    await this.redisGuardService.lockChat(id);
    await this.redisSessionService.publishCacheInvalidation("chat", id);
  }

  async isChatDeleted(chatId: string | ObjectId): Promise<boolean> {
    return await this.redisGuardService.isChatLocked(chatId.toString());
  }

  async unlockChat(chatId: string | ObjectId) {
    const id = chatId.toString();
    await this.redisGuardService.unlockChat(id);
    await this.redisSessionService.publishCacheInvalidation("chat", id);
  }
}

// Note: Instance creation moved to registry.ts
