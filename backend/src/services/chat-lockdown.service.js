// O(1) hash store for deleted chats lockdown logic
class ChatLockdownService {
    constructor() {
        // Store deleted chat IDs as Strings for O(1) lookup
        this.deletedChats = new Set();
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

export const chatLockdownService = new ChatLockdownService();
