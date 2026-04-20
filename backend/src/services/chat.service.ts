import { ObjectId } from "mongodb";
import { Document, DefaultSchemaOptions, Types } from "mongoose";
import { Server } from "socket.io";

import ChatModel, { IChat } from "../models/chat.model";
import MessageModel from "../models/message.model";
import UserModel from "../models/user.model";
import { AppError } from "../utils/AppError";
import { chatLockdownService } from "./chat-lockdown.service";
import { notificationService } from "./notification.service";

class ChatService {
  public Chat: typeof ChatModel;
  public Message: typeof MessageModel;
  public User: typeof UserModel;
  public io: Server | null;

  constructor(
    chatModel: typeof ChatModel,
    messageModel: typeof MessageModel,
    userModel: typeof UserModel,
  ) {
    this.Chat = chatModel;
    this.Message = messageModel;
    this.User = userModel;
    this.io = null;
  }

  /**
   * Allow socket controller to inject io instance
   */
  setIO(io: Server) {
    this.io = io;
  }

  /**
   * Get accepted chat listing for a user.
   */
  async getChatListing(userId: string | import("mongodb").ObjectId): Promise<Array<object>> {
    const chats = await this.Chat.find({
      $or: [{ userA: userId }, { userB: userId }],
      isDeleted: false,
      status: "accepted",
    })
      .populate("userA", "username name email avatar_url")
      .populate("userB", "username name email avatar_url");

    return chats.map((chat) => this._transformChat(chat, userId));
  }

  /**
   * Get pending chat requests for a user.
   */
  async getChatRequests(userId: string | import("mongodb").ObjectId): Promise<Array<object>> {
    const chats = await this.Chat.find({
      $or: [{ userA: userId }, { userB: userId }],
      isDeleted: false,
      status: "pending",
    })
      .populate("userA", "username name email avatar_url")
      .populate("userB", "username name email avatar_url");

    return chats.map((chat) => this._transformChat(chat, userId));
  }

  /**
   * Internal helper to standardize chat object for client
   * @private
   */
  _transformChat(chat: IChat, userId: string | ObjectId) {
    const userIdStr = userId.toString();
    const otherUser = chat.userA._id.toString() === userIdStr ? chat.userB : chat.userA;
    const unread = chat.unreadCounts?.get?.(userIdStr) || 0;

    return {
      id: chat._id.toString(),
      status: chat.status,
      createdBy: chat.createdBy,
      otherUser: {
        id: (otherUser as any)._id?.toString() || otherUser.toString(),
        username: (otherUser as any).username,
        name: (otherUser as any).name || null,
        email: (otherUser as any).email,
        avatarUrl: (otherUser as any).avatar_url,
      },
      lastMessage: chat.lastMessage?.contentBody
        ? {
            contentBody: chat.lastMessage.contentBody,
            senderId: chat.lastMessage.senderId?.toString(),
            sentAt: chat.lastMessage.sentAt,
          }
        : null,
      unreadCount: unread,
      createdAt: chat.createdAt,
    };
  }

  /**
   * Search accepted chats by username, name, or email
   */
  async searchChats(
    userId: string | import("mongodb").ObjectId,
    query: string,
  ): Promise<Array<object>> {
    if (!query || query.trim().length === 0) return [];

    const uid = new ObjectId(userId);
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchStr = escapedQuery.startsWith("@") ? escapedQuery.slice(1) : escapedQuery; // managed username search
    let q = new RegExp("^" + searchStr, "i");

    // Aggregation pipeline to join chats and users efficiently in a single round-trip
    const chats = await this.Chat.aggregate([
      {
        $match: {
          $or: [{ userA: uid }, { userB: uid }],
          isDeleted: false,
          status: "accepted",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { userA: "$userA", userB: "$userB" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    // The user must be one of the chat participants
                    {
                      $or: [{ $eq: ["$_id", "$$userA"] }, { $eq: ["$_id", "$$userB"] }],
                    },
                    // But NOT the current user searching
                    { $ne: ["$_id", uid] },
                  ],
                },
                // Search criteria on the user (ReDoS-safe regex)
                $or: [{ username: q }, { name: q }, { email: q }],
              },
            },
            { $limit: 1 },
            { $project: { username: 1, name: 1, email: 1, avatar_url: 1 } },
          ],
          as: "otherUser",
        },
      },
      // Filter out chats where the other user didn't match the search
      { $unwind: "$otherUser" },
      { $limit: 50 },
      {
        $project: {
          id: "$_id",
          status: 1,
          otherUser: {
            id: { $toString: "$otherUser._id" },
            username: "$otherUser.username",
            name: "$otherUser.name",
            email: "$otherUser.email",
            avatarUrl: "$otherUser.avatar_url",
          },
          lastMessage: "$lastMessage",
          unreadCount: {
            $ifNull: [{ $getField: { field: userId.toString(), input: "$unreadCounts" } }, 0],
          },
          createdAt: 1,
        },
      },
    ]);

    return chats.map((chat) => ({
      ...chat,
      lastMessage: chat.lastMessage?.contentBody
        ? {
            contentBody: chat.lastMessage.contentBody,
            senderId: chat.lastMessage.senderId,
            sentAt: chat.lastMessage.sentAt,
          }
        : null,
    }));
  }

  /**
   * Create a chat request by username lookup.
   * - Sender provides a username
   * - We find the target user
   * - We create a pending chat (or return existing)
   * - We send a notification to the receiver
   */
  async requestChat(
    senderId: string | import("mongodb").ObjectId,
    targetUsername: string,
  ): Promise<object> {
    // 1. Sanitize and find the target user by exact username match
    const sanitizedUsername = targetUsername.startsWith("@")
      ? targetUsername.slice(1)
      : targetUsername;
    const targetUser = await this.User.findOne({ username: sanitizedUsername });
    if (!targetUser) {
      throw AppError.notFound("User", "USER_NOT_FOUND");
    }

    // 2. Prevent self-chat
    if (targetUser._id.toString() === senderId.toString()) {
      throw AppError.badRequest("You cannot start a chat with yourself", "SELF_CHAT");
    }

    // 3. Consistent ordering for unique constraint
    const aId = new ObjectId(targetUser._id);
    const bId = new ObjectId(senderId);
    const [userA, userB] = aId.getTimestamp() < bId.getTimestamp() ? [aId, bId] : [bId, aId];

    // 4. Check for existing chat
    const existingChat = await this.Chat.findOne({ userA, userB, isDeleted: false });
    if (existingChat) {
      if (existingChat.status === "rejected") {
        // Allow re-requesting a rejected chat
        existingChat.status = "pending";
        existingChat.createdBy = senderId as ObjectId;
        await existingChat.save();
        return existingChat;
      }
      if (existingChat.status === "pending") {
        throw AppError.badRequest("A chat request is already pending", "CHAT_ALREADY_PENDING");
      }
      // Already accepted
      throw AppError.badRequest("You already have an active chat with this user", "CHAT_EXISTS");
    }

    // 5. Create new pending chat
    const chat = await this.Chat.create({
      userA,
      userB,
      createdBy: senderId,
      status: "pending",
    });

    // 6. Create notification for the receiver
    const sender = await this.User.findById(senderId);
    const notification = await notificationService.create({
      recipientId: targetUser._id,
      senderId: senderId,
      type: "chat_request",
      referenceId: chat._id,
      message: `${sender?.username} sent you a chat request`,
    });

    // 7. Push real-time notification
    if (this.io) {
      this.io.to(`user:${targetUser._id}`).emit("notification", notification);
    }

    return chat;
  }

  /**
   * Accept a pending chat request.
   * Only the receiver (non-creator) can accept.
   */
  async acceptChat(chatId: string, userId: string): Promise<object> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    if (chat.status !== "pending")
      throw AppError.badRequest("Chat is not pending", "CHAT_NOT_PENDING");
    if (chat.createdBy.toString() === userId.toString()) {
      throw AppError.forbidden("Only the receiver can accept a chat request");
    }

    // Verify user is part of this chat
    const isParticipant =
      chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
    if (!isParticipant) throw AppError.forbidden("You are not part of this chat");

    chat.status = "accepted";
    await chat.save();

    // Notify the sender that their request was accepted
    const acceptor = await this.User.findById(userId);
    const notification = await notificationService.create({
      recipientId: chat.createdBy,
      senderId: userId,
      type: "request_accepted",
      referenceId: chat._id,
      message: `${acceptor?.username || "A user"} accepted your chat request`,
    });

    if (this.io) {
      this.io.to(`user:${chat.createdBy}`).emit("notification", notification);
      this.io.to(`user:${chat.createdBy}`).emit("chat_accepted", { chatId: chat._id });
    }

    return chat;
  }

  /**
   * Reject a pending chat request.
   * Only the receiver (non-creator) can reject.
   */
  async rejectChat(
    chatId: string | import("mongodb").ObjectId,
    userId: string | import("mongodb").ObjectId,
  ): Promise<object> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    if (chat.status !== "pending")
      throw AppError.badRequest("Chat is not pending", "CHAT_NOT_PENDING");
    if (chat.createdBy.toString() === userId.toString()) {
      throw AppError.forbidden("Only the receiver can reject a chat request");
    }

    const isParticipant =
      chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
    if (!isParticipant) throw AppError.forbidden("You are not part of this chat");

    chat.status = "rejected";
    await chat.save();

    // Notify the sender
    const rejector = await this.User.findById(userId);
    const notification = await notificationService.create({
      recipientId: chat.createdBy,
      senderId: userId,
      type: "request_rejected",
      referenceId: chat._id,
      message: `${rejector?.username || "A user"} declined your chat request`,
    });

    if (this.io) {
      this.io.to(`user:${chat.createdBy}`).emit("notification", notification);
    }

    return chat;
  }

  async deleteChat(
    chatId: string | import("mongodb").ObjectId,
    userId: string | import("mongodb").ObjectId,
  ): Promise<object> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }

    // Verify user is a participant
    const isParticipant =
      chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
    if (!isParticipant) throw AppError.forbidden("You are not part of this chat");

    chat.isDeleted = true;
    chat.deletedAt = new Date();
    await chat.save();
    chatLockdownService.lockdownChat(chatId);

    return { message: "Chat successfully deleted" };
  }

  async getChatMessages(
    chatId: string | import("mongodb").ObjectId,
    userId: string,
    limit: number = 50,
    cursor: string | null,
  ): Promise<Array<object>> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }
    if (chat.status !== "accepted") {
      throw AppError.forbidden("Chat must be accepted before viewing messages");
    }

    // Verify user is a participant
    const isParticipant =
      chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
    if (!isParticipant) throw AppError.forbidden("You are not part of this chat");

    const query = { chatId: chat._id };
    if (cursor) {
      (query as any)._id = { $lt: cursor };
    }

    const messages = await this.Message.find(query).sort({ _id: -1 }).limit(limit);

    const transformed = messages.map((m) => {
      const msg = m.toObject();
      if (msg.isDeleted) {
        msg.contentBody = "This message was deleted";
        msg.reactions = [];
        msg.attachment = { kind: null, url: null };
      }
      return { ...msg, id: msg._id.toString() };
    });

    return transformed.reverse();
  }

  /**
   * Mark a chat as read for a specific user.
   * Resets unreadCounts[userId] to 0.
   */
  async markChatRead(
    chatId: string | import("mongodb").ObjectId,
    userId: string | import("mongodb").ObjectId,
  ): Promise<object> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }
    const isParticipant =
      chat.userA.toString() === userId.toString() || chat.userB.toString() === userId.toString();
    if (!isParticipant) {
      throw AppError.forbidden("You are not part of this chat");
    }
    chat.unreadCounts.set(userId.toString(), 0);
    await chat.save();
    return { message: "Chat marked as read" };
  }
}

export const chatService = new ChatService(ChatModel, MessageModel, UserModel);
