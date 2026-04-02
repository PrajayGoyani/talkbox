import { chatLockdownService } from './chat-lockdown.service.js';
import MessageModel from '../models/message.model.js';
import ChatModel from '../models/chat.model.js';
import UserModel from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

class SocketService {
    constructor(messageModel) {
        this.Message = messageModel;
        this.io = null;
        // Map of userId -> socket instance
        this.activeConnections = new Map(); 
    }

    init(io) {
        this.io = io;
    }

    handleConnection(socket) {
        const userId = socket.data.user.id;
        
        // Single Socket Connection Zone Security
        // Enforce strict connection takeover
        const existingSocket = this.activeConnections.get(userId);
        if (existingSocket) {
            existingSocket.emit('error', { message: 'Connection taken over by a new device/tab.' });
            existingSocket.disconnect();
        }
        
        this.activeConnections.set(userId, socket);
        socket.join(`user:${userId}`);

        socket.on('disconnect', () => {
            if (this.activeConnections.get(userId)?.id === socket.id) {
                this.activeConnections.delete(userId);
            }
        });
    }

    async saveAndDeliverMessage(senderId, payload) {
        const { chatId, receiverId, contentBody, idempotencyKey } = payload;
        
        // 1. Deleted Chat Lockdown Check
        if (chatLockdownService.isChatDeleted(chatId)) {
            throw AppError.forbidden('Cannot send messages to a deleted chat.');
        }

        // 2. Verify chat is accepted
        const chat = await ChatModel.findById(chatId);
        if (!chat || chat.status !== 'accepted') {
            throw AppError.forbidden('Chat must be accepted before sending messages.');
        }

        // 3. Real-time Reliability Enforcer: Deduplication
        const existingMessage = await this.Message.findOne({ idempotencyKey });
        if (existingMessage) {
            return existingMessage;
        }

        // 4. Save Message
        const message = await this.Message.create({
            chatId,
            senderId,
            contentBody,
            idempotencyKey
        });

        // 5. Update chat's lastMessage + increment receiver's unreadCounts
        await ChatModel.findByIdAndUpdate(chatId, {
            lastMessage: {
                contentBody,
                senderId,
                sentAt: message.createdAt
            },
            $inc: { [`unreadCounts.${receiverId}`]: 1 }
        });

        // 6. Deliver Message to receiver if connected
        this.io.to(`user:${receiverId}`).emit('receive_message', message);

        // 7. Emit lightweight message_alert for toast/browser notification
        try {
            const sender = await UserModel.findById(senderId);
            const preview = contentBody.length > 60
                ? contentBody.substring(0, 60) + '...'
                : contentBody;
            this.io.to(`user:${receiverId}`).emit('message_alert', {
                chatId,
                senderId,
                senderUsername: sender.username,
                preview
            });
        } catch (err) {
            console.error('Failed to emit message_alert:', err);
        }

        return message;
    }
}

export const socketService = new SocketService(MessageModel);
