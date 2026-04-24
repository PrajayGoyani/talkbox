import { FREE_PLAN_CHAT_LIMIT } from "@config/env";
import Chat, { IChat, IChatModel } from "@models/chat.model";
import Message, { IMessageModel } from "@models/message.model";
import User, { IUser, IUserModel } from "@models/user.model";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { notificationService } from "@services/notification.service";
import { socketService } from "@services/socket.service";
import { AppError } from "@utils/AppError";
import { getScrubCutoff } from "@utils/date.utils";
import { extractEmojiMetadata } from "@utils/emoji.utils";
import { ObjectId } from "mongodb";
import { Server } from "socket.io";

import { ChatDto, ChatListingResponse } from "@/types/chat.types";
import { MessageDto } from "@/types/socket.types";

/**
 * Populated user fields returned from .populate() calls.
 */
interface PopulatedUser {
  _id: ObjectId;
  username: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  plan: "free" | "pro";
}

class ChatService {
  public Chat: IChatModel;
  public Message: IMessageModel;
  public User: IUserModel;
  public io: Server | null;

  constructor(chatModel: IChatModel, messageModel: IMessageModel, userModel: IUserModel) {
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

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Assert the given userId is a participant of the chat.
   * Throws 403 Forbidden if not.
   */
  private _assertParticipant(chat: IChat, userId: string | ObjectId): void {
    const uid = userId.toString();
    if (chat.userA.toString() !== uid && chat.userB.toString() !== uid) {
      throw AppError.forbidden("You are not part of this chat");
    }
  }

  private _encodeCursor(timestamp: Date, id: string | ObjectId) {
    return Buffer.from(JSON.stringify({ t: timestamp.getTime(), id: id.toString() })).toString("base64");
  }

  private _decodeCursor(cursor: string) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
      if (!ObjectId.isValid(decoded.id)) return null;
      return { t: new Date(decoded.t), id: decoded.id };
      // oxlint-disable-next-line no-unused-vars
    } catch (_e) {
      return null;
    }
  }

  /**
   * Internal helper to standardize chat object for client.
   */
  private _transformChat(chat: IChat, userId: string | ObjectId): ChatDto {
    const userIdStr = userId.toString();
    const otherUser = (chat.userA._id.toString() === userIdStr ? chat.userB : chat.userA) as unknown as PopulatedUser;
    const unread = chat.unreadCounts?.get?.(userIdStr) || 0;

    return {
      id: chat._id.toString(),
      status: chat.status,
      createdBy: chat.createdBy.toString(),
      otherUser: {
        id: otherUser._id?.toString() || (otherUser as unknown as ObjectId).toString(),
        username: otherUser.username,
        name: otherUser.name || null,
        email: otherUser.email,
        avatarUrl: otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}`,
        plan: otherUser.plan,
      },
      lastMessage: chat.lastMessage?.contentBody
        ? {
            contentBody: chat.lastMessage.contentBody,
            senderId: chat.lastMessage.senderId?.toString() || null,
            sentAt: chat.lastMessage.sentAt,
          }
        : null,
      unreadCount: unread,
      createdAt: chat.createdAt,
    };
  }

  // ─── Chat Listing ───────────────────────────────────────────────────

  /**
   * Get accepted chat listing for a user with pagination.
   */
  async getChatListing(
    userId: string | import("mongodb").ObjectId,
    limit = 20,
    cursor: string | null = null,
  ): Promise<ChatListingResponse> {
    const query: any = {
      $or: [{ userA: userId }, { userB: userId }],
      isDeleted: false,
      status: "accepted",
    };

    if (cursor) {
      const decoded = this._decodeCursor(cursor);
      if (decoded) {
        // Compound filter for stable pagination:
        // (sentAt < decoded.t) OR (sentAt == decoded.t AND _id < decoded.id)
        query.$and = [
          {
            $or: [
              { "lastMessage.sentAt": { $lt: decoded.t } },
              {
                $and: [{ "lastMessage.sentAt": decoded.t }, { _id: { $lt: new ObjectId(decoded.id) } }],
              },
            ],
          },
        ];
      }
    }

    const chats = await this.Chat.find(query)
      .sort({ "lastMessage.sentAt": -1, _id: -1 })
      .limit(limit + 1)
      .populate("userA", "username name email avatar_url plan")
      .populate("userB", "username name email avatar_url plan");

    const hasMore = chats.length > limit;
    const results = hasMore ? chats.slice(0, limit) : chats;

    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const last = results[results.length - 1];
      nextCursor = this._encodeCursor(last.lastMessage?.sentAt || last.createdAt, last._id.toString());
    }

    return {
      data: results.map((chat) => this._transformChat(chat, userId)),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get pending chat requests for a user with pagination.
   */
  async getChatRequests(
    userId: string | import("mongodb").ObjectId,
    limit = 20,
    cursor: string | null = null,
  ): Promise<ChatListingResponse> {
    const query: any = {
      $or: [{ userA: userId }, { userB: userId }],
      isDeleted: false,
      status: "pending",
    };

    if (cursor) {
      const decoded = this._decodeCursor(cursor);
      if (decoded) {
        query.$and = [
          {
            $or: [
              { createdAt: { $lt: decoded.t } },
              {
                $and: [{ createdAt: decoded.t }, { _id: { $lt: new ObjectId(decoded.id) } }],
              },
            ],
          },
        ];
      }
    }

    const chats = await this.Chat.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("userA", "username name email avatar_url plan")
      .populate("userB", "username name email avatar_url plan");

    const hasMore = chats.length > limit;
    const results = hasMore ? chats.slice(0, limit) : chats;

    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const last = results[results.length - 1];
      nextCursor = this._encodeCursor(last.createdAt, last._id.toString());
    }

    return {
      data: results.map((chat) => this._transformChat(chat, userId)),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Search accepted chats by username, name, or email with cursor pagination.
   * @scalability-risk This uses a case-insensitive prefix regex inside an aggregation lookup.
   * Currently, we are using standard MongoDB aggregation ($lookup + $match) rather than
   * Atlas Search ($search), which scales linearly with the number of chats a user has ($O(N)$).
   *
   * @future-recommendation If typical user chat count exceeds 5k, transition to an
   * inverted-index search solution to achieve O(1) search performance:
   * 1. MongoDB Atlas Search: Ideal for zero-infrastructure overhead.
   * 2. Meilisearch: Recommended for premium search UX, typo tolerance, and speed.
   *    Reference: https://www.meilisearch.com/
   */
  async searchChats(
    userId: string | import("mongodb").ObjectId,
    query: string,
    limit = 20,
    cursor: string | null = null,
  ): Promise<ChatListingResponse> {
    if (!query || query.trim().length === 0) return { data: [], nextCursor: null, hasMore: false };

    const uid = new ObjectId(userId);
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchStr = escapedQuery.startsWith("@") ? escapedQuery.slice(1) : escapedQuery;
    let q = new RegExp("^" + searchStr, "i");

    // Reuse shared cursor decoding
    const cursorObj = cursor ? this._decodeCursor(cursor) : null;

    // Aggregation pipeline for paginated search
    const pipeline: any[] = [
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
                  $and: [{ $or: [{ $eq: ["$_id", "$$userA"] }, { $eq: ["$_id", "$$userB"] }] }, { $ne: ["$_id", uid] }],
                },
                $or: [{ username: q }, { name: q }, { email: q }],
              },
            },
            { $limit: 1 },
            { $project: { username: 1, name: 1, email: 1, avatar_url: 1, plan: 1 } },
          ],
          as: "otherUser",
        },
      },
      { $unwind: "$otherUser" },
      // Support for sorting by last message sent time (same as listing)
      {
        $addFields: {
          sortTime: { $ifNull: ["$lastMessage.sentAt", "$createdAt"] },
        },
      },
    ];

    // Cursor filtering
    if (cursorObj) {
      pipeline.push({
        $match: {
          $or: [
            { sortTime: { $lt: cursorObj.t } },
            {
              $and: [{ sortTime: { $eq: cursorObj.t } }, { _id: { $lt: new ObjectId(cursorObj.id) } }],
            },
          ],
        },
      });
    }

    // Sort and limit
    pipeline.push({ $sort: { sortTime: -1, _id: -1 } });
    pipeline.push({ $limit: limit + 1 });

    // Final projection
    pipeline.push({
      $project: {
        id: { $toString: "$_id" },
        status: 1,
        createdBy: { $toString: "$createdBy" },
        participants: [{ $toString: "$userA" }, { $toString: "$userB" }],
        otherUser: {
          id: { $toString: "$otherUser._id" },
          username: "$otherUser.username",
          name: "$otherUser.name",
          email: "$otherUser.email",
          avatarUrl: "$otherUser.avatar_url",
          plan: "$otherUser.plan",
        },
        lastMessage: "$lastMessage",
        unreadCount: {
          $let: {
            vars: {
              unread: {
                $filter: {
                  input: { $objectToArray: "$unreadCounts" },
                  cond: { $eq: ["$$this.k", { $toString: uid }] },
                },
              },
            },
            in: { $ifNull: [{ $arrayElemAt: ["$$unread.v", 0] }, 0] },
          },
        },
        createdAt: 1,
        sortTime: 1,
      },
    });

    const chats = await this.Chat.aggregate(pipeline);

    let hasMore = false;
    let nextCursor: string | null = null;

    if (chats.length > limit) {
      hasMore = true;
      const lastItem = chats[limit - 1];
      const cursorPayload = {
        t: new Date(lastItem.sortTime).getTime(),
        id: lastItem.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString("base64");
      chats.pop();
    }

    return {
      data: chats.map((chat) => ({
        ...chat,
        lastMessage: chat.lastMessage?.contentBody
          ? {
              contentBody: chat.lastMessage.contentBody,
              senderId: chat.lastMessage.senderId?.toString() || null,
              sentAt: chat.lastMessage.sentAt,
            }
          : null,
      })) as ChatDto[],
      nextCursor,
      hasMore,
    };
  }

  // ─── Chat Actions ───────────────────────────────────────────────────

  /**
   * Create a chat request by username lookup.
   * - Sender provides a username
   * - We find the target user
   * - We create a pending chat (or return existing)
   * - We send a notification to the receiver
   */
  async requestChat(senderId: string | import("mongodb").ObjectId, targetUsername: string): Promise<IChat> {
    // 1. Sanitize and find the target user by exact username match
    const sanitizedUsername = targetUsername.startsWith("@") ? targetUsername.slice(1) : targetUsername;
    const targetUser = await this.User.findOne({ username: sanitizedUsername });
    if (!targetUser) {
      throw AppError.notFound("User", "USER_NOT_FOUND");
    }

    // 2. Look up requesting user (reused for limit check AND notification below)
    const requestingUser = await this.User.findById(senderId);

    // --- Pro: Enforce Chat Limits ---
    if (requestingUser?.plan === "free") {
      const activeCount = await this.Chat.countDocuments({
        $or: [{ userA: senderId }, { userB: senderId }],
        status: "accepted",
        isDeleted: false,
      });
      if (activeCount >= FREE_PLAN_CHAT_LIMIT) {
        throw AppError.limitReached("Active chats", "CHAT_LIMIT_REACHED");
      }
    }
    // -----------------------------------

    // 3. Prevent self-chat
    if (targetUser._id.toString() === senderId.toString()) {
      throw AppError.badRequest("You cannot start a chat with yourself", "SELF_CHAT");
    }

    // 4. Consistent ordering for unique constraint
    const aId = new ObjectId(targetUser._id);
    const bId = new ObjectId(senderId);
    const [userA, userB] = aId.getTimestamp() < bId.getTimestamp() ? [aId, bId] : [bId, aId];

    // 5. Check for existing chat
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

    // 6. Create new pending chat
    const chat = await this.Chat.create({
      userA,
      userB,
      createdBy: senderId,
      status: "pending",
      lastMessage: {
        sentAt: new Date(), // Initialize for sorting consistency
      },
    });

    // 7. Create notification for the receiver (reuse requestingUser — no duplicate query)
    const notification = await notificationService.create({
      recipientId: targetUser._id,
      senderId: senderId,
      type: "chat_request",
      referenceId: chat._id,
      message: `${requestingUser?.username} sent you a chat request`,
    });

    // 8. Push real-time notification
    if (this.io) {
      this.io.to(`user:${targetUser._id}`).emit("notification", notification);
    }

    return chat;
  }

  /**
   * Accept a pending chat request.
   * Only the receiver (non-creator) can accept.
   */
  async acceptChat(chatId: string, userId: string): Promise<IChat> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    if (chat.status !== "pending") throw AppError.badRequest("Chat is not pending", "CHAT_NOT_PENDING");
    if (chat.createdBy.toString() === userId.toString()) {
      throw AppError.forbidden("Only the receiver can accept a chat request");
    }

    this._assertParticipant(chat, userId);

    chat.status = "accepted";
    await chat.save();

    // Invalidate presence cache for both users
    await socketService.invalidatePartnerCache(chat.userA.toString());
    await socketService.invalidatePartnerCache(chat.userB.toString());

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
  ): Promise<IChat> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    if (chat.status !== "pending") throw AppError.badRequest("Chat is not pending", "CHAT_NOT_PENDING");
    if (chat.createdBy.toString() === userId.toString()) {
      throw AppError.forbidden("Only the receiver can reject a chat request");
    }

    this._assertParticipant(chat, userId);

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
  ): Promise<{ message: string }> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }

    this._assertParticipant(chat, userId);

    chat.isDeleted = true;
    chat.deletedAt = new Date();
    await chat.save();

    // Invalidate presence cache for both users
    await socketService.invalidatePartnerCache(chat.userA.toString());
    await socketService.invalidatePartnerCache(chat.userB.toString());

    await chatLockdownService.lockdownChat(chatId);

    return { message: "Chat successfully deleted" };
  }

  // ─── Messages ───────────────────────────────────────────────────────

  /**
   * Get chat messages with cursor pagination and plan-aware scrubbing.
   * The `plan` parameter should be passed from the authenticated user context
   * to avoid an unnecessary DB lookup.
   */
  async getChatMessages(
    chatId: string | import("mongodb").ObjectId,
    userId: string,
    limit: number = 50,
    cursor: string | null,
    plan: "free" | "pro" = "free",
  ): Promise<MessageDto[]> {
    const chat = await this.Chat.findById(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }
    if (chat.status !== "accepted") {
      throw AppError.forbidden("Chat must be accepted before viewing messages");
    }

    this._assertParticipant(chat, userId);

    const query = { chatId: chat._id };
    if (cursor) {
      (query as any)._id = { $lt: cursor };
    }

    const messages = await this.Message.find(query).sort({ _id: -1 }).limit(limit);
    const scrubCutoff = getScrubCutoff();

    const transformed = messages.map((m) => {
      const msg = m.toObject();

      const isOlderThanLimit = m.createdAt < scrubCutoff;

      if (msg.isDeleted) {
        msg.contentBody = "This message was deleted";
        msg.reactions = [];
        msg.attachment = { kind: null, url: null };
      } else if (plan === "free" && isOlderThanLimit) {
        // --- Pro: Virtual Scrubbing ---
        msg.contentBody = "Message unavailable on Free plan.";
        msg.reactions = [];
        msg.attachment = { kind: null, url: null };
        msg.isScrubbed = true;
        // ---------------------------------
      }

      const skipEmojiMetadata: boolean = msg.isDeleted || (plan === "free" && isOlderThanLimit);
      const emojiMetadata = skipEmojiMetadata ? undefined : extractEmojiMetadata(msg.contentBody);
      return {
        ...msg,
        id: msg._id.toString(),
        chatId: msg.chatId.toString(),
        senderId: msg.senderId.toString(),
        emojiMetadata,
        reactions: msg.reactions?.map((r: any) => ({
          emoji: r.emoji,
          slug: r.slug,
          users: r.users.map((u: any) => u.toString()),
        })),
      } as MessageDto;
    });

    return transformed.reverse();
  }

  /**
   * Mark a chat as read for a specific user.
   * Uses atomic findOneAndUpdate to avoid the findById + save double roundtrip.
   */
  async markChatRead(
    chatId: string | import("mongodb").ObjectId,
    userId: string | import("mongodb").ObjectId,
  ): Promise<{ message: string }> {
    const result = await this.Chat.findOneAndUpdate(
      {
        _id: chatId,
        $or: [{ userA: userId }, { userB: userId }],
      },
      { $set: { [`unreadCounts.${userId}`]: 0 } },
    );

    if (!result) {
      throw AppError.notFound("Chat not found or you are not a participant", "CHAT_NOT_FOUND");
    }

    return { message: "Chat marked as read" };
  }
}

export const chatService = new ChatService(Chat, Message, User);
