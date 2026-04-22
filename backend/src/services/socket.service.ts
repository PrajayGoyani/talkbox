import { FREE_PLAN_SCRUB_DAYS, PRO_PLAN_SESSION_LIMIT, REACTIONS_MAX_UNIQUE } from "@config/env";
import Chat from "@models/chat.model";
import Message from "@models/message.model";
import User from "@models/user.model";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { AppError } from "@utils/AppError";
import { extractEmojiMetadata, getCanonicalSlug } from "@utils/emoji.utils";
import { Types } from "mongoose";

import { AuthenticatedSocketUser, MessageDto, TypedIO, TypedSocket } from "@/types/socket.types";

class SocketService {
  public Message: typeof Message;
  public io: TypedIO | null;
  public activeConnections: Map<string, Set<TypedSocket>>;

  constructor(messageModel: typeof Message) {
    this.Message = messageModel;
    this.io = null;
    // Map of userId -> Set of active socket instances
    this.activeConnections = new Map();
  }

  init(io: TypedIO) {
    this.io = io;
  }

  handleConnection(socket: TypedSocket) {
    const userId = socket.data.user.id;
    const plan = socket.data.user.plan;

    // Session Limit Enforcement
    let userSockets = this.activeConnections.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      this.activeConnections.set(userId, userSockets);
    }

    if (plan === "free") {
      // Free users: 1 connection limit (Strict Takeover)
      if (userSockets.size > 0) {
        userSockets.forEach((s) => {
          s.emit("session_error", {
            reason: "takeover",
            message: "Session opened in another window.",
          });
          s.disconnect();
        });
        userSockets.clear();
      }
    } else if (plan === "pro") {
      // Pro users: configured session limit
      if (userSockets.size >= PRO_PLAN_SESSION_LIMIT) {
        socket.emit("error", {
          message: `Pro session limit reached (max ${PRO_PLAN_SESSION_LIMIT} tabs).`,
        });
        socket.disconnect();
        return;
      }
    }

    userSockets.add(socket);
    socket.join(`user:${userId}`);

    // Broadcast online presence if this is the FIRST connection
    if (userSockets.size === 1) {
      this.notifyStatusChange(userId, true);
    }

    // Fetch and send partners' status to the newly connected user
    this.emitPartnersStatus(userId, socket);

    socket.on("disconnect", () => {
      userSockets?.delete(socket);
      if (userSockets?.size === 0) {
        this.activeConnections.delete(userId);
        this.notifyStatusChange(userId, false);
      }
    });
  }

  async emitPartnersStatus(userId: string, socket: TypedSocket) {
    try {
      const uidStr = userId.toString();
      const chats = await Chat.find({
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
      const offlinePartnerIds = partnerIdsArr.filter((id) => !this.activeConnections.has(id));

      let offlineUserMap = new Map();
      if (offlinePartnerIds.length > 0) {
        const offlineUsers = await User.find({ _id: { $in: offlinePartnerIds } })
          .select("lastSeen")
          .lean();
        offlineUserMap = new Map(offlineUsers.map((u) => [u._id.toString(), u.lastSeen]));
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

  async notifyStatusChange(userId: string, isOnline: boolean) {
    try {
      const uidStr = userId.toString();

      if (!isOnline) {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      }

      // Find all accepted chats for this user
      const chats = await Chat.find({
        $or: [{ userA: uidStr }, { userB: uidStr }],
        status: "accepted",
        isDeleted: false,
      }).select("userA userB");

      // Extract unique partner IDs
      const partnerIds = new Set<string>();
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
        this.io?.to(`user:${partnerId}`).emit("user_status", statusPayload);
      }
    } catch (err) {
      console.error("Error notifying status change:", err);
    }
  }

  async handleTyping(
    sender: AuthenticatedSocketUser,
    payload: { receiverId: string; chatId: string },
    isTyping: boolean,
  ) {
    const senderId = sender.id;
    const { receiverId, chatId } = payload;
    if (!receiverId || !chatId) return;

    // Security: Prevent arbitrary users from flooding target room bindings unless they share an active chat
    try {
      const isValid = await Chat.exists({
        _id: chatId,
        status: "accepted",
        $or: [
          { userA: senderId, userB: receiverId },
          { userA: receiverId, userB: senderId },
        ],
      });

      if (!isValid) return;
      // oxlint-disable-next-line no-unused-vars
    } catch (_e) {
      return;
    }

    this.io?.to(`user:${receiverId}`).emit(isTyping ? "typing_start" : "typing_stop", {
      chatId,
      userId: senderId,
    });
  }

  async handleReaction(sender: AuthenticatedSocketUser, payload: { messageId: string; emoji: string; slug?: string }) {
    const senderId = new Types.ObjectId(sender.id);
    const { messageId, emoji, slug } = payload;
    if (!messageId || !emoji) {
      return;
    }

    try {
      const message = await this.Message.findById(messageId);
      if (!message) return;

      const chat = await Chat.findById(message.chatId);
      if (!chat) return;

      // --- Zenith: Restrict actions on scrubbed messages ---
      const scrubCutoff = new Date();
      scrubCutoff.setDate(scrubCutoff.getDate() - FREE_PLAN_SCRUB_DAYS);
      if (sender.plan === "free" && message.createdAt < scrubCutoff) {
        return;
      }
      // -----------------------------------------------------

      // Security: Check if user is part of the chat
      const isParticipant =
        chat.userA.toString() === senderId.toString() || chat.userB.toString() === senderId.toString();

      if (!isParticipant) {
        return;
      }

      const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

      if (reactionIndex > -1) {
        const reactionGroup = message.reactions[reactionIndex];
        const userIndex = reactionGroup.users.findIndex((u) => u.toString() === senderId.toString());

        if (userIndex > -1) {
          // Toggle off: Remove user's reaction
          reactionGroup.users.splice(userIndex, 1);
          // If no more users, remove the emoji reaction entry entirely
          if (reactionGroup.users.length === 0) {
            message.reactions.splice(reactionIndex, 1);
          }
        } else {
          // Toggle on: Add user to existing emoji reaction group
          reactionGroup.users.push(senderId);

          // Canonical Normalization: Ensure the reaction group always uses
          // a standardized slug derived from the backend registry.
          const canonicalSlug = getCanonicalSlug(emoji, slug);
          if (
            canonicalSlug &&
            (!reactionGroup.slug || reactionGroup.slug === "emoji" || reactionGroup.slug !== canonicalSlug)
          ) {
            reactionGroup.slug = canonicalSlug;
          }
        }
      } else {
        // Create new emoji reaction entry if limit not reached
        if (message.reactions.length < REACTIONS_MAX_UNIQUE) {
          message.reactions.push({
            emoji,
            slug: getCanonicalSlug(emoji, slug),
            users: [senderId],
          });
        }
      }

      message.markModified("reactions");
      await message.save();

      // Determine receiver
      const receiverId = chat.userA.toString() === senderId.toString() ? chat.userB.toString() : chat.userA.toString();

      const savedMessage = message.toObject();
      const updatePayload = {
        messageId: messageId.toString(),
        chatId: message.chatId.toString(),
        // Serialize ObjectIds to plain strings so the frontend string-comparison works
        reactions: savedMessage.reactions.map(
          (r: { emoji: string; slug: string; users: string[] | Types.ObjectId[] }) => ({
            emoji: r.emoji,
            slug: r.slug,
            users: r.users.map((u) => u.toString()),
          }),
        ),
      };

      // Emit to both users
      this.io?.to(`user:${senderId}`).emit("message_reaction_update", updatePayload);
      this.io?.to(`user:${receiverId}`).emit("message_reaction_update", updatePayload);
    } catch (err) {
      console.error("[SocketService] Error handling reaction:", err);
    }
  }

  async saveAndDeliverMessage(
    sender: AuthenticatedSocketUser,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
  ): Promise<MessageDto> {
    const senderId = sender.id;
    const { chatId, receiverId, contentBody, idempotencyKey } = payload;

    // 1. Deleted Chat Lockdown Check
    if (chatLockdownService.isChatDeleted(chatId)) {
      throw AppError.forbidden("Cannot send messages to a deleted chat.");
    }

    // 2. Verify chat is accepted
    const chat = await Chat.findById(chatId);
    if (!chat || chat.status !== "accepted") {
      throw AppError.forbidden("Chat must be accepted before sending messages.");
    }

    // 3. Real-time Reliability Enforcer: Deduplication
    const existingMessage = await this.Message.findOne({ idempotencyKey });
    if (existingMessage) {
      const msgObj = existingMessage.toObject();
      return {
        ...msgObj,
        id: existingMessage._id.toString(),
        chatId: existingMessage.chatId.toString(),
        senderId: existingMessage.senderId.toString(),
        reactions: msgObj.reactions?.map((r: any) => ({
          emoji: r.emoji,
          slug: r.slug,
          users: r.users.map((u: any) => u.toString()),
        })),
      } as MessageDto;
    }

    // 4. Save Message
    const message = await this.Message.create({
      chatId,
      senderId,
      contentBody,
      idempotencyKey,
    });

    // 5. Update chat's lastMessage + increment receiver's unreadCounts
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: {
        contentBody,
        senderId,
        sentAt: message.createdAt,
      },
      $inc: { [`unreadCounts.${receiverId}`]: 1 },
    });

    // 6. Deliver Message to receiver if connected
    // Create DTO with emojiMetadata for the frontend tooltips
    const messageObj = message.toObject();
    const messageDto: MessageDto = {
      ...messageObj,
      id: message._id.toString(),
      chatId: message.chatId.toString(),
      senderId: message.senderId.toString(),
      emojiMetadata: extractEmojiMetadata(contentBody),
      reactions: messageObj.reactions?.map((r: any) => ({
        emoji: r.emoji,
        slug: r.slug,
        users: r.users.map((u: any) => u.toString()),
      })),
    };

    this.io?.to(`user:${receiverId}`).emit("receive_message", messageDto);
    // Also echo back to sender for full metadata if they have multiple devices or need it
    this.io?.to(`user:${senderId}`).emit("receive_message", messageDto);

    // 7. Emit lightweight message_alert for toast/browser notification
    try {
      const preview = contentBody.length > 60 ? contentBody.substring(0, 60) + "..." : contentBody;
      this.io?.to(`user:${receiverId}`).emit("message_alert", {
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

    return messageDto;
  }

  async handleDeleteMessage(sender: AuthenticatedSocketUser, payload: { messageId: string }) {
    const senderId = sender.id;
    const { messageId } = payload;
    if (!messageId) return;

    try {
      const message = await this.Message.findById(messageId);
      if (!message || message.isDeleted) return;

      const chat = await Chat.findById(message.chatId);
      if (!chat || chat.isDeleted) return;

      // --- Zenith: Restrict actions on scrubbed messages ---
      const scrubCutoff = new Date();
      scrubCutoff.setDate(scrubCutoff.getDate() - FREE_PLAN_SCRUB_DAYS);
      if (sender.plan === "free" && message.createdAt < scrubCutoff) {
        return;
      }
      // -----------------------------------------------------

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
        chat.lastMessage.sentAt.getTime() === message.createdAt.getTime(),
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
        this.io?.to(`user:${uid}`).emit("message_deleted", updatePayload);
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

export const socketService = new SocketService(Message);
