import { AppError } from '../utils/AppError.js';
import { ObjectId } from 'mongodb';
import { chatLockdownService } from './chat-lockdown.service.js';
import { notificationService } from './notification.service.js';

/**
 * @typedef {import('mongoose').Model} Model
 * @typedef {import('socket.io').Server} Server
 */

class ChatService {
    /**
     * @param {Model} chatModel
     * @param {Model} messageModel
     * @param {Model} userModel
     */
    constructor(chatModel, messageModel, userModel) {
        /** @type {Model} */
        this.Chat = chatModel;
        /** @type {Model} */
        this.Message = messageModel;
        /** @type {Model} */
        this.User = userModel;
        /** @type {Server | null} */
        this.io = null;
    }

    /** 
     * Allow socket controller to inject io instance 
     * @param {Server} io
     */
    setIO(io) {
        this.io = io;
    }

    /**
     * Get chat listing for a user. Returns chats with status included.
     * Filters out rejected and deleted chats.
     * @param {string | import('mongodb').ObjectId} userId
     * @returns {Promise<Array<Object>>}
     */
    async getChatListing(userId) {
        const chats = await this.Chat.find({
            $or: [{ userA: userId }, { userB: userId }],
            isDeleted: false,
            status: { $ne: 'rejected' }
        })
        .populate('userA', 'username name email avatar_url')
        .populate('userB', 'username name email avatar_url');

        return chats.map(chat => {
            const otherUser = chat.userA._id.toString() === userId.toString() ? chat.userB : chat.userA;
            const unread = chat.unreadCounts?.get?.(userId.toString()) || 0;
            return {
                id: chat._id,
                status: chat.status,
                createdBy: chat.createdBy,
                otherUser: {
                    id: otherUser._id,
                    username: otherUser.username,
                    name: otherUser.name || null,
                    email: otherUser.email,
                    avatarUrl: otherUser.avatar_url
                },
                lastMessage: chat.lastMessage?.contentBody ? {
                    contentBody: chat.lastMessage.contentBody,
                    senderId: chat.lastMessage.senderId,
                    sentAt: chat.lastMessage.sentAt
                } : null,
                unreadCount: unread,
                createdAt: chat.createdAt
            };
        });
    }

    /**
     * Create a chat request by username lookup.
     * - Sender provides a username
     * - We find the target user
     * - We create a pending chat (or return existing)
     * - We send a notification to the receiver
     * @param {string | import('mongodb').ObjectId} senderId
     * @param {string} targetUsername
     * @returns {Promise<Object>}
     */
    async requestChat(senderId, targetUsername) {
        // 1. Find the target user by exact username match
        const targetUser = await this.User.findOne({ username: targetUsername });
        if (!targetUser) {
            throw AppError.notFound('User not found', 'USER_NOT_FOUND');
        }

        // 2. Prevent self-chat
        if (targetUser._id.toString() === senderId.toString()) {
            throw AppError.badRequest('You cannot start a chat with yourself', 'SELF_CHAT');
        }

        // 3. Consistent ordering for unique constraint
        const aId = new ObjectId(targetUser._id);
        const bId = new ObjectId(senderId);
        const [userA, userB] = (aId.getTimestamp() < bId.getTimestamp()) ? [aId, bId] : [bId, aId];

        // 4. Check for existing chat
        const existingChat = await this.Chat.findOne({ userA, userB, isDeleted: false });
        if (existingChat) {
            if (existingChat.status === 'rejected') {
                // Allow re-requesting a rejected chat
                existingChat.status = 'pending';
                existingChat.createdBy = senderId;
                await existingChat.save();
                return existingChat;
            }
            if (existingChat.status === 'pending') {
                throw AppError.badRequest('A chat request is already pending', 'CHAT_ALREADY_PENDING');
            }
            // Already accepted
            throw AppError.badRequest('You already have an active chat with this user', 'CHAT_EXISTS');
        }

        // 5. Create new pending chat
        const chat = await this.Chat.create({
            userA,
            userB,
            createdBy: senderId,
            status: 'pending'
        });

        // 6. Create notification for the receiver
        const sender = await this.User.findById(senderId);
        const notification = await notificationService.create({
            recipientId: targetUser._id,
            senderId: senderId,
            type: 'chat_request',
            referenceId: chat._id,
            message: `${sender.username} sent you a chat request`
        });

        // 7. Push real-time notification
        if (this.io) {
            this.io.to(`user:${targetUser._id}`).emit('notification', notification);
        }

        return chat;
    }

    /**
     * Accept a pending chat request.
     * Only the receiver (non-creator) can accept.
     * @param {string | import('mongodb').ObjectId} chatId
     * @param {string | import('mongodb').ObjectId} userId
     * @returns {Promise<Object>}
     */
    async acceptChat(chatId, userId) {
        const chat = await this.Chat.findById(chatId);
        if (!chat) throw AppError.notFound('Chat not found', 'CHAT_NOT_FOUND');
        if (chat.status !== 'pending') throw AppError.badRequest('Chat is not pending', 'CHAT_NOT_PENDING');
        if (chat.createdBy.toString() === userId.toString()) {
            throw AppError.forbidden('Only the receiver can accept a chat request');
        }

        // Verify user is part of this chat
        const isParticipant = chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
        if (!isParticipant) throw AppError.forbidden('You are not part of this chat');

        chat.status = 'accepted';
        await chat.save();

        // Notify the sender that their request was accepted
        const acceptor = await this.User.findById(userId);
        const notification = await notificationService.create({
            recipientId: chat.createdBy,
            senderId: userId,
            type: 'request_accepted',
            referenceId: chat._id,
            message: `${acceptor.username} accepted your chat request`
        });

        if (this.io) {
            this.io.to(`user:${chat.createdBy}`).emit('notification', notification);
            this.io.to(`user:${chat.createdBy}`).emit('chat_accepted', { chatId: chat._id });
        }

        return chat;
    }

    /**
     * Reject a pending chat request.
     * Only the receiver (non-creator) can reject.
     * @param {string | import('mongodb').ObjectId} chatId
     * @param {string | import('mongodb').ObjectId} userId
     * @returns {Promise<Object>}
     */
    async rejectChat(chatId, userId) {
        const chat = await this.Chat.findById(chatId);
        if (!chat) throw AppError.notFound('Chat not found', 'CHAT_NOT_FOUND');
        if (chat.status !== 'pending') throw AppError.badRequest('Chat is not pending', 'CHAT_NOT_PENDING');
        if (chat.createdBy.toString() === userId.toString()) {
            throw AppError.forbidden('Only the receiver can reject a chat request');
        }

        const isParticipant = chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
        if (!isParticipant) throw AppError.forbidden('You are not part of this chat');

        chat.status = 'rejected';
        await chat.save();

        // Notify the sender
        const rejector = await this.User.findById(userId);
        const notification = await notificationService.create({
            recipientId: chat.createdBy,
            senderId: userId,
            type: 'request_rejected',
            referenceId: chat._id,
            message: `${rejector.username} declined your chat request`
        });

        if (this.io) {
            this.io.to(`user:${chat.createdBy}`).emit('notification', notification);
        }

        return chat;
    }

    /** 
     * Legacy method kept for backward-compat 
     * @param {string | import('mongodb').ObjectId} creatorId
     * @param {string | import('mongodb').ObjectId} receiverId
     * @returns {Promise<Object>}
     */
    async createOrGetChat(creatorId, receiverId) {
        const aId = new ObjectId(receiverId);
        const bId = new ObjectId(creatorId);
        const [userA, userB] = (aId.getTimestamp() < bId.getTimestamp()) ? [aId, bId] : [bId, aId];
        
        const chat = await this.Chat.findOneAndUpdate(
            { userA, userB },
            { $setOnInsert: { userA, userB, createdBy: creatorId, status: 'pending' } },
            { upsert: true, returnDocument: "after" }
        );
        return chat;
    }

    /**
     * @param {string | import('mongodb').ObjectId} chatId
     * @param {Object} data
     * @returns {Promise<void>}
     */
    async updateChat(chatId, data) {
        throw new Error('Not implemented');
    }

    /**
     * @param {string | import('mongodb').ObjectId} chatId
     * @returns {Promise<Object>}
     */
    async deleteChat(chatId) {
        const chat = await this.Chat.findById(chatId);
        if (!chat) {
            throw AppError.notFound('Chat not found', 'CHAT_NOT_FOUND');
        }
        
        chat.isDeleted = true;
        chat.deletedAt = new Date();
        await chat.save();
        chatLockdownService.lockdownChat(chatId);
        
        return { message: 'Chat successfully deleted' };
    }

    /**
     * @param {string | import('mongodb').ObjectId} chatId
     * @returns {Promise<Array<Object>>}
     */
    async getChatMessages(chatId) {
        const chat = await this.Chat.findById(chatId);
        if (!chat) {
            throw AppError.notFound('Chat not found', 'CHAT_NOT_FOUND');
        }
        if (chat.status !== 'accepted') {
            throw AppError.forbidden('Chat must be accepted before viewing messages');
        }
        const messages = await this.Message.find({ chatId: chat._id });
        return messages;
    }

    /**
     * Mark a chat as read for a specific user.
     * Resets unreadCounts[userId] to 0.
     * @param {string | import('mongodb').ObjectId} chatId
     * @param {string | import('mongodb').ObjectId} userId
     * @returns {Promise<Object>}
     */
    async markChatRead(chatId, userId) {
        const chat = await this.Chat.findById(chatId);
        if (!chat) {
            throw AppError.notFound('Chat not found', 'CHAT_NOT_FOUND');
        }
        const isParticipant = chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
        if (!isParticipant) {
            throw AppError.forbidden('You are not part of this chat');
        }
        chat.unreadCounts.set(userId.toString(), 0);
        await chat.save();
        return { message: 'Chat marked as read' };
    }
}

import ChatModel from '../models/chat.model.js';
import MessageModel from '../models/message.model.js';
import UserModel from '../models/user.model.js';

export const chatService = new ChatService(ChatModel, MessageModel, UserModel);
