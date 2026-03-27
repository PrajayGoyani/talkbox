import { chatLockdownService } from './chat-lockdown.service.js';
import MessageModel from '../models/message.model.js';
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

        // 2. Real-time Reliability Enforcer: Deduplication
        const existingMessage = await this.Message.findOne({ idempotencyKey });
        if (existingMessage) {
            // Already processed, idempotency applied. Return the existing.
            return existingMessage;
        }

        // 3. Save Message
        const message = await this.Message.create({
            chatId,
            senderId,
            contentBody,
            idempotencyKey
        });

        // 4. Deliver Message if receiver is connected
        this.io.to(`user:${receiverId}`).emit('receive_message', message);

        return message;
    }
}

export const socketService = new SocketService(MessageModel);
