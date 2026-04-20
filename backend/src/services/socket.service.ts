import ChatModel from "../models/chat.model";
import MessageModel from "../models/message.model";
import UserModel from "../models/user.model";
import { AppError } from "../utils/AppError";
import { chatLockdownService } from "./chat-lockdown.service";

const MAX_UNIQUE_REACTIONS = 20;

class SocketService {
  public Message: any;
  public io: any;
  public activeConnections: any;

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
      const uidStr = userId.toString();
      const chats = await ChatModel.find({
        $or: [{ userA: uidStr }, { userB: uidStr }],
        status: "accepted",
      }).select("userA userB");

      const partnerIds = new Set<string>();
      chats.forEach((chat) => {
        const aStr = chat.userA.toString();
        const bStr = chat.userB.toString();
        if (aStr !== uidStr) partnerIds.add(aStr);
        if (bStr !== uidStr) partnerIds.add(bStr);
      });

      const partnerIdsArr = Array.from(partnerIds);
      const offlinePartnerIds = partnerIdsArr.filter(id => !this.activeConnections.has(id));
      
      let offlineUserMap = new Map();
      if (offlinePartnerIds.length > 0) {
        const offlineUsers = await UserModel.find({ _id: { $in: offlinePartnerIds } }).select("lastSeen").lean();
        offlineUserMap = new Map(offlineUsers.map(u => [u._id.toString(), u.lastSeen]));
      }

      for (const partnerId of partnerIdsArr) {
        const isOnline = this.activeConnections.has(partnerId);
        let lastSeen: Date | null = null;

        if (!isOnline) {
          lastSeen = offlineUserMap.get(partnerId) || null;
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
      const uidStr = userId.toString();

      if (!isOnline) {
        await UserModel.findByIdAndUpdate(userId, { lastSeen: new Date() });
      }

      // Find all accepted chats for this user
      const chats = await ChatModel.find({
        $or: [{ userA: uidStr }, { userB: uidStr }],
        status: "accepted",
        isDeleted: false,
      }).select("userA userB");

      // Extract unique partner IDs
      const partnerIds = new Set();
      chats.forEach((chat) => {
        const aStr = chat.userA.toString();
        const bStr = chat.userB.toString();
        if (aStr !== uidStr) partnerIds.add(aStr);
        if (bStr !== uidStr) partnerIds.add(bStr);
      });

      // Emit to each connected partner
      const statusPayload = {
        userId: uidStr,
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
    } catch (_e) {
      return;
    }

    this.io.to(`user:${receiverId}`).emit(isTyping ? "typing_start" : "typing_stop", {
      chatId,
      userId: senderId,
    });
  }

  async handleReaction(senderId, payload) {
    const { messageId, emoji } = payload;
    if (!messageId || !emoji) {
      return;
    }

    try {
      const message = await this.Message.findById(messageId);
      if (!message) return;

      const chat = await ChatModel.findById(message.chatId);
      if (!chat) return;

      // Security: Check if user is part of the chat
      const isParticipant =
        chat.userA.toString() === senderId.toString() ||
        chat.userB.toString() === senderId.toString();
      
      if (!isParticipant) {
        return;
      }

      const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

      if (reactionIndex > -1) {
        const userIndex = message.reactions[reactionIndex].users.findIndex(
          (u) => u.toString() === senderId.toString(),
        );

        if (userIndex > -1) {
          // Remove user's reaction
          message.reactions[reactionIndex].users.splice(userIndex, 1);
          // If no more users, remove the emoji reaction entry entirely
          if (message.reactions[reactionIndex].users.length === 0) {
            message.reactions.splice(reactionIndex, 1);
          }
        } else {
          // Add user to existing emoji reaction
          message.reactions[reactionIndex].users.push(senderId);
        }
      } else {
        // Create new emoji reaction entry if limit not reached
        if (message.reactions.length < MAX_UNIQUE_REACTIONS) {
          message.reactions.push({
            emoji,
            users: [senderId],
          });
        }
      }

      message.markModified("reactions");
      await message.save();

      // Determine receiver
      const receiverId =
        chat.userA.toString() === senderId.toString()
          ? chat.userB.toString()
          : chat.userA.toString();

      const savedMessage = message.toObject();
      const updatePayload = {
        messageId: messageId.toString(),
        chatId: message.chatId.toString(),
        // Serialize ObjectIds to plain strings so the frontend string-comparison works
        reactions: savedMessage.reactions.map((r: { emoji: string; users: any[] }) => ({
          emoji: r.emoji,
          users: r.users.map((u: any) => u.toString()),
        })),
      };

      // Emit to both users
      this.io.to(`user:${senderId}`).emit("message_reaction_update", updatePayload);
      this.io.to(`user:${receiverId}`).emit("message_reaction_update", updatePayload);
    } catch (err) {
      console.error("[SocketService] Error handling reaction:", err);
    }
  }

   async saveAndDeliverMessage(sender, payload) {
    const senderId = sender.id;
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

  async handleDeleteMessage(senderId: string, payload: { messageId: string }) {
    const { messageId } = payload;
    if (!messageId) return;

    try {
      const message = await this.Message.findById(messageId);
      if (!message || message.isDeleted) return;

      const chat = await ChatModel.findById(message.chatId);
      if (!chat || chat.isDeleted) return;

      // Security: Only sender can delete their message
      if (message.senderId.toString() !== senderId.toString()) {
        return;
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.contentBody = "This message was deleted";
      message.attachment = { kind: null, url: null };
      message.reactions = [];
      await message.save();

      const isLastMessage = Boolean(
        chat.lastMessage &&
          chat.lastMessage.sentAt &&
          chat.lastMessage.sentAt.getTime() === message.createdAt.getTime()
      );

      // Determine participants
      const participants = [chat.userA.toString(), chat.userB.toString()];
      const updatePayload = {
        messageId: messageId.toString(),
        chatId: message.chatId.toString(),
        isLastMessage,
      };

      // notify both
      participants.forEach((uid) => {
        this.io.to(`user:${uid}`).emit("message_deleted", updatePayload);
      });

      // Update chat's lastMessage if it was this one
      if (isLastMessage) {
        chat.lastMessage.contentBody = "Message deleted";
        await chat.save();
      }
    } catch (err) {
      console.error("[SocketService] Error deleting message:", err);
    }
  }
}

export const socketService = new SocketService(MessageModel);
