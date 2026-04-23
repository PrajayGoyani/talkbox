import { NODE_ENV } from "@config/env";
import Chat, { IChatModel } from "@models/chat.model";
import { redisService } from "@services/redis.service";

/**
 * O(1) hash store for deleted chats lockdown logic.
 * Prevents messages from being sent to deleted chats without a DB query.
 */
class ChatLockdownService {
  public deletedChats: Set<string>;
  public Chat: IChatModel;

  constructor(chatModel: IChatModel) {
    this.deletedChats = new Set();
    this.Chat = chatModel;
  }

  /**
   * Initialize Redis subscription for distributed lockdown syncing.
   * This ensures O(1) checks are accurate across all server instances.
   */
  async init() {
    if (redisService.subClient) {
      await redisService.subClient.subscribe("chat:lockdown");
      redisService.subClient.on("message", (channel, message) => {
        if (channel === "chat:lockdown") {
          try {
            const { action, chatId } = JSON.parse(message);
            if (action === "lock") {
              this.deletedChats.add(chatId);
            } else if (action === "unlock") {
              this.deletedChats.delete(chatId);
            }
          } catch (err) {
            console.error("[ChatLockdownService] Failed to parse lockdown message:", err);
          }
        }
      });
    }
  }

  /**
   * Hydrate the in-memory lockdown set from the database on startup.
   * Only runs in production to avoid slowing down dev restarts.
   */
  async hydrate() {
    if (NODE_ENV !== "production") {
      return;
    }
    const chats = await this.Chat.find({ isDeleted: true }).select("_id");
    chats.forEach((chat) => this.lockdownChat(chat._id, true));
    console.log(`Lockdown Hydration complete: ${chats.length} chats locked.`);
  }

  async lockdownChat(chatId: string | import("mongodb").ObjectId, isLocalOnly = false) {
    const id = chatId.toString();
    this.deletedChats.add(id);

    if (!isLocalOnly && redisService.client && redisService.isConnected) {
      await redisService.client.publish("chat:lockdown", JSON.stringify({ action: "lock", chatId: id }));
    }
  }

  isChatDeleted(chatId: string | import("mongodb").ObjectId): boolean {
    return this.deletedChats.has(chatId.toString());
  }

  async unlockChat(chatId: string | import("mongodb").ObjectId, isLocalOnly = false) {
    const id = chatId.toString();
    this.deletedChats.delete(id);

    if (!isLocalOnly && redisService.client && redisService.isConnected) {
      await redisService.client.publish("chat:lockdown", JSON.stringify({ action: "unlock", chatId: id }));
    }
  }
}

export const chatLockdownService = new ChatLockdownService(Chat);
