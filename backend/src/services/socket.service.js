import { chatLockdownService } from "./chat-lockdown.service.js";
import MessageModel from "../models/message.model.js";
import ChatModel from "../models/chat.model.js";
import UserModel from "../models/user.model.js";
import { AppError } from "../utils/AppError.js";

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
      existingSocket.emit("error", { message: "Connection taken over by a new device/tab." });
      existingSocket.disconnect();
    }

    this.activeConnections.set(userId, socket);
    socket.join(`user:${userId}`);

    // Broadcast online presence
    this.notifyStatusChange(userId, true);

    // Fetch and send partners' status to the newly connected user
    this.emitPartnersStatus(userId, socket);

    socket.on("disconnect", () => {
      if (this.activeConnections.get(userId)?.id === socket.id) {
        this.activeConnections.delete(userId);
        this.notifyStatusChange(userId, false);
      }
    });
  }

  async emitPartnersStatus(userId, socket) {
    try {
      const chats = await ChatModel.find({
        participants: userId,
        status: "accepted",
      });

      const partnerIds = new Set();
      chats.forEach((chat) => {
        chat.participants.forEach((p) => {
          const pIdStr = p.toString();
          if (pIdStr !== userId.toString()) partnerIds.add(pIdStr);
        });
      });

      for (const partnerId of partnerIds) {
        const isOnline = this.activeConnections.has(partnerId);
        let lastSeen = null;

        if (!isOnline) {
          const partner = await UserModel.findById(partnerId);
          if (partner) {
            lastSeen = partner.lastSeen;
          }
        }

        socket.emit("user_status", {
          userId: partnerId,
          isOnline,
          lastSeen,
        });
      }
    } catch (err) {
      console.error("Error emitting partners status:", err);
    }
  }

  async notifyStatusChange(userId, isOnline) {
    try {
      if (!isOnline) {
        await UserModel.findByIdAndUpdate(userId, { lastSeen: new Date() });
      }

      // Find all accepted chats for this user
      const chats = await ChatModel.find({
        participants: userId,
        status: "accepted",
      });

      // Extract unique partner IDs
      const partnerIds = new Set();
      chats.forEach((chat) => {
        chat.participants.forEach((p) => {
          const pIdStr = p.toString();
          if (pIdStr !== userId.toString()) partnerIds.add(pIdStr);
        });
      });

      // Emit to each connected partner
      const statusPayload = {
        userId,
        isOnline,
        lastSeen: isOnline ? null : new Date(),
      };

      for (const partnerId of partnerIds) {
        this.io.to(`user:${partnerId}`).emit("user_status", statusPayload);
      }
    } catch (err) {
      console.error("Error notifying status change:", err);
    }
  }

  async handleTyping(senderId, payload, isTyping) {
    const { receiverId, chatId } = payload;
    if (!receiverId || !chatId) return;

    // Security: Prevent arbitrary users from flooding target room bindings unless they share an active chat
    try {
      const isValid = await ChatModel.exists({
        _id: chatId,
        status: "accepted",
        $or: [
          { userA: senderId, userB: receiverId },
          { userA: receiverId, userB: senderId },
        ],
      });

      if (!isValid) return;
    } catch (e) {
      return;
    }

    this.io.to(`user:${receiverId}`).emit(isTyping ? "typing_start" : "typing_stop", {
      chatId,
      userId: senderId,
    });
  }

  async saveAndDeliverMessage(senderId, payload) {
    const { chatId, receiverId, contentBody, idempotencyKey } = payload;

    // 1. Deleted Chat Lockdown Check
    if (chatLockdownService.isChatDeleted(chatId)) {
      throw AppError.forbidden("Cannot send messages to a deleted chat.");
    }

    // 2. Verify chat is accepted
    const chat = await ChatModel.findById(chatId);
    if (!chat || chat.status !== "accepted") {
      throw AppError.forbidden("Chat must be accepted before sending messages.");
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
      idempotencyKey,
    });

    // 5. Update chat's lastMessage + increment receiver's unreadCounts
    await ChatModel.findByIdAndUpdate(chatId, {
      lastMessage: {
        contentBody,
        senderId,
        sentAt: message.createdAt,
      },
      $inc: { [`unreadCounts.${receiverId}`]: 1 },
    });

    // 6. Deliver Message to receiver if connected
    this.io.to(`user:${receiverId}`).emit("receive_message", message);

    // 7. Emit lightweight message_alert for toast/browser notification
    try {
      const sender = await UserModel.findById(senderId);
      const preview = contentBody.length > 60 ? contentBody.substring(0, 60) + "..." : contentBody;
      this.io.to(`user:${receiverId}`).emit("message_alert", {
        chatId,
        senderId,
        senderName: sender.name || null,
        senderUsername: sender.username,
        senderAvatar: sender.avatarUrl,
        preview,
      });
    } catch (err) {
      console.error("Failed to emit message_alert:", err);
    }

    return message;
  }
}

export const socketService = new SocketService(MessageModel);
