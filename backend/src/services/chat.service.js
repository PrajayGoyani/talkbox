import { AppError } from '../utils/AppError.js';
import { ObjectId } from 'mongodb';

import { chatLockdownService } from './chat-lockdown.service.js';

class ChatService {
    constructor(chatModel, messageModel) {
        this.Chat = chatModel;
        this.Message = messageModel;
    }

    async getChatListing(userId) {
        const chats = await this.Chat.find({ createdBy: userId })
            .populate('reciverId', 'name email avatar_url');
        return chats;
    }

    async createOrGetChat(creatorId, receiverId) {
        const aId = new ObjectId(receiverId);
        const bId = new ObjectId(creatorId);
        // Ensure consistent ordering of user IDs for the unique chat lookup
        const [userA, userB] = (aId.getTimestamp() < bId.getTimestamp()) ? [aId, bId] : [bId, aId];
        
        const chat = await this.Chat.findOneAndUpdate(
            { userA, userB },
            { $setOnInsert: { userA, userB, createdBy: creatorId } },
            { upsert: true, returnDocument: "after" }
        );
        return chat;
    }

    async updateChat(chatId, data) {
        // TODO: implement logic
        throw new Error('Not implemented');
    }

    async deleteChat(chatId) {
        // Implement soft delete and lockdown
        const chat = await this.Chat.findById(chatId);
        if (!chat) {
            throw AppError.notFound('Chat not found', 'CHAT_NOT_FOUND');
        }
        
        chat.isDeleted = true;
        chat.deletedAt = new Date();
        await chat.save();
        
        // Add to lockdown to prevent incoming messages or socket events immediately
        chatLockdownService.lockdownChat(chatId);
        
        return { message: 'Chat successfully deleted' };
    }

    async getChatMessages(chatId) {
        const chat = await this.Chat.findById(chatId);
        if (!chat) {
            throw AppError.notFound('Chat not found', 'CHAT_NOT_FOUND');
        }
        const messages = await this.Message.find({ chat: chat._id });
        return messages;
    }
}

import ChatModel from '../models/chat.model.js';
import MessageModel from '../models/message.model.js';

export const chatService = new ChatService(ChatModel, MessageModel);
