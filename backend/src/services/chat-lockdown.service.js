// O(1) hash store for deleted chats lockdown logic
class ChatLockdownService {
  constructor(chatModel) {
    // Store deleted chat IDs as Strings for O(1) lookup
    this.deletedChats = new Set();
    this.Chat = chatModel;
  }

  async hydrate() {
    // persist deleted chats in memory on startup
    if (NODE_ENV !== "production") {
      return;
    }
    const chats = await this.Chat.find({ isDeleted: true }).select("_id");
    chats.forEach((chat) => this.lockdownChat(chat._id));
    console.log(`Lockdown Hydration complete: ${chats.length} chats locked.`);
  }

  lockdownChat(chatId) {
    this.deletedChats.add(chatId.toString());
  }

  isChatDeleted(chatId) {
    return this.deletedChats.has(chatId.toString());
  }

  unlockChat(chatId) {
    this.deletedChats.delete(chatId.toString());
  }
}

import { NODE_ENV } from "../config/env.js";
import ChatModel from "../models/chat.model.js";
export const chatLockdownService = new ChatLockdownService(ChatModel);
