import { PRO_PLAN_SESSION_LIMIT, REACTIONS_MAX_UNIQUE } from "@config/env";
import Chat, { IChat } from "@models/chat.model";
import Message, { IMessage } from "@models/message.model";
import User from "@models/user.model";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { isPastModifyLimit, isScrubbed } from "@utils/date.utils";
import { extractEmojiMetadata, getCanonicalSlug } from "@utils/emoji.utils";
import { LRUCache } from "lru-cache";
import { Types } from "mongoose";

import { AuthenticatedSocketUser, MessageDto, TypedIO, TypedSocket } from "@/types/socket.types";

/**
 * TTL for participant cache entries (10 minutes).
 * Prevents unbounded memory growth while still avoiding DB hits on hot paths.
 */
const PARTICIPANT_CACHE_TTL_MS = 10 * 60 * 1000;
const PARTICIPANT_CACHE_MAX = 10000;

const PARTNER_CACHE_TTL_MS = 15 * 60 * 1000;
const PARTNER_CACHE_MAX = 10000;

class SocketService {
  public Message: typeof Message;
  public io: TypedIO | null;
  public activeConnections: Map<string, Set<TypedSocket>>;
  /**
   * In-memory TTL cache for chat participants to avoid DB hits on high-frequency events.
   * Format: Map<chatId, { participants: Set<userId>, expiresAt: number }>
   */
  private participantCache: LRUCache<string, Set<string>>;
  /**
   * Cache for a user's partner IDs (accepted chats).
   * Key: "userId" or "userId:activeOnly"
   */
  private partnerCache: LRUCache<string, Set<string>>;

  /**
   * Tracks which local users care about a specific partner's status.
   * partnerId -> Set of local userIds
   */
  private statusWatchers: Map<string, Set<string>>;
  /**
   * Fast lookup for which partners a local user is watching.
   * userId -> Set of partnerIds
   */
  private userWatchedPartners: Map<string, Set<string>>;

  constructor(messageModel: typeof Message) {
    this.Message = messageModel;
    this.io = null;
    // Map of userId -> Set of active socket instances
    this.activeConnections = new Map();
    this.participantCache = new LRUCache({
      max: PARTICIPANT_CACHE_MAX,
      ttl: PARTICIPANT_CACHE_TTL_MS,
    });
    this.partnerCache = new LRUCache({
      max: PARTNER_CACHE_MAX,
      ttl: PARTNER_CACHE_TTL_MS,
    });
    this.statusWatchers = new Map();
    this.userWatchedPartners = new Map();
  }

  init(io: TypedIO) {
    this.io = io;

    // Subscribe to global presence and session signals from Redis
    if (redisService.subClient) {
      redisService.subClient.subscribe("presence:updates", "cache:invalidate", "session:takeover");
      redisService.subClient.on("message", (channel, message) => {
        if (channel === "presence:updates") {
          try {
            const { userId, isOnline } = JSON.parse(message);
            this._handleGlobalStatusUpdate(userId, isOnline);
          } catch (err) {
            console.error("[SocketService] Error parsing presence update:", err);
          }
        } else if (channel === "cache:invalidate") {
          try {
            const { type, id } = JSON.parse(message);
            this._handleGlobalCacheInvalidation(type, id);
          } catch (err) {
            console.error("[SocketService] Error parsing cache invalidation:", err);
          }
        } else if (channel === "session:takeover") {
          try {
            const { userId, triggerSocketId } = JSON.parse(message);
            this._handleGlobalTakeover(userId, triggerSocketId);
          } catch (err) {
            console.error("[SocketService] Error parsing session takeover:", err);
          }
        }
      });
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Get partner IDs for a user from their accepted chats.
   * Shared between emitPartnersStatus and notifyStatusChange.
   */
  private async _getPartnerIds(userId: string, excludeDeleted = false): Promise<Set<string>> {
    const cacheKey = excludeDeleted ? `${userId}:active` : userId;

    // Level 1: In-Memory (LRU)
    const l1Cached = this.partnerCache.get(cacheKey);
    if (l1Cached) return l1Cached;

    // Level 2: Redis (L2)
    const l2Cached = await redisService.getCachedPartners(userId, excludeDeleted);
    if (l2Cached) {
      this.partnerCache.set(cacheKey, l2Cached);
      return l2Cached;
    }

    // Level 3: Database
    const filter: any = {
      $or: [{ userA: userId }, { userB: userId }],
      status: "accepted",
    };
    if (excludeDeleted) filter.isDeleted = false;

    const chats = await Chat.find(filter).select("userA userB").lean();
    const partners = new Set<string>();
    for (const chat of chats) {
      const a = chat.userA.toString();
      const b = chat.userB.toString();
      if (a !== userId) partners.add(a);
      if (b !== userId) partners.add(b);
    }

    // Populate Caches
    const partnerArr = Array.from(partners);
    this.partnerCache.set(cacheKey, partners);
    await redisService.setCachedPartners(userId, partnerArr, excludeDeleted);

    return partners;
  }

  /**
   * Invalidate partner cache entries for a user.
   */
  public async invalidatePartnerCache(userId: string): Promise<void> {
    this.partnerCache.delete(userId);
    this.partnerCache.delete(`${userId}:active`);
    await redisService.invalidatePartnerCache(userId);

    // Notify other instances to clear their local L1 caches
    if (redisService.client && redisService.isConnected) {
      await redisService.client.publish("cache:invalidate", JSON.stringify({ type: "partner", id: userId }));
    }
  }

  /**
   * Handle session takeover received from Redis Pub/Sub.
   */
  private _handleGlobalTakeover(userId: string, triggerSocketId?: string) {
    const userSockets = this.activeConnections.get(userId);
    if (!userSockets) return;

    userSockets.forEach((s) => {
      // Disconnect all sockets except the one that triggered the takeover (if on this instance)
      if (s.id !== triggerSocketId) {
        s.emit("session_error", { reason: "takeover", message: "Session opened in another window." });
        s.disconnect();
        userSockets.delete(s);
      }
    });

    if (userSockets.size === 0) {
      this.activeConnections.delete(userId);
    }
  }

  /**
   * Handle status updates received from Redis Pub/Sub.
   */
  private _handleGlobalStatusUpdate(userId: string, isOnline: boolean) {
    const interestedUsers = this.statusWatchers.get(userId);
    if (!interestedUsers) return;

    const payload = {
      userId,
      isOnline,
      lastSeen: isOnline ? null : new Date(),
    };

    for (const watcherId of interestedUsers) {
      this.io?.to(`user:${watcherId}`).emit("user_status", payload);
    }
  }

  /**
   * Handle cache invalidation received from Redis Pub/Sub.
   */
  private _handleGlobalCacheInvalidation(type: string, id: string) {
    if (type === "partner") {
      this.partnerCache.delete(id);
      this.partnerCache.delete(`${id}:active`);
    } else if (type === "user") {
      // UserCacheService is imported elsewhere but we can't easily reach it here
      // without circular deps or global event bus.
      // For now, focusing on partner cache which is in this class.
    }
  }

  private _getCachedParticipants(chatId: string): Set<string> | null {
    return this.participantCache.get(chatId) || null;
  }

  /**
   * Store participants in the TTL cache.
   */
  private _cacheParticipants(chatId: string, participants: Set<string>): void {
    this.participantCache.set(chatId, participants);
  }

  /**
   * Validate that a message can be modified (edited/deleted) by the sender.
   * Returns the message and chat if valid, null otherwise.
   *
   * Checks: message exists, chat exists, scrub restriction, sender ownership, time limit.
   */
  private async _validateMessageModification(
    sender: AuthenticatedSocketUser,
    messageId: string,
  ): Promise<{ message: IMessage; chat: IChat } | null> {
    const message = await this.Message.findById(messageId);
    if (!message || message.isDeleted) return null;

    const chat = await Chat.findById(message.chatId);
    if (!chat || chat.isDeleted) return null;

    // Restrict actions on scrubbed messages for free users
    if (isScrubbed(sender.plan, message.createdAt)) return null;

    // Only sender can modify their message
    if (message.senderId.toString() !== sender.id) return null;

    // Enforce modification time limit
    if (isPastModifyLimit(message.createdAt)) return null;

    return { message, chat };
  }

  /**
   * Check if a message was the last message in its chat.
   */
  private _isLastMessage(chat: IChat, message: IMessage): boolean {
    return Boolean(
      chat.lastMessage && chat.lastMessage.sentAt && chat.lastMessage.sentAt.getTime() === message.createdAt.getTime(),
    );
  }

  // ─── Connection Management ──────────────────────────────────────────

  async handleConnection(socket: TypedSocket) {
    const userId = socket.data.user.id;
    const plan = socket.data.user.plan;

    // 1. Increment global session count in Redis
    const globalCount = await redisService.incrementGlobalSession(userId, socket.id);

    // 2. Local Tracking (Optimistic add before takeover to prevent watcher flicker)
    let userSockets = this.activeConnections.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      this.activeConnections.set(userId, userSockets);
    }
    userSockets.add(socket);
    socket.join(`user:${userId}`);

    // 3. Session Limit Enforcement (Global Cluster-wide)
    if (plan === "free") {
      // Free users: 1 connection limit
      if (globalCount > 1) {
        // Trigger takeover on other instances
        await redisService.publishSessionTakeover(userId, socket.id);
        // Immediate local takeover for sockets on THIS instance
        this._handleGlobalTakeover(userId, socket.id);
      }
    } else if (plan === "pro") {
      // Pro users: PRO_PLAN_SESSION_LIMIT connections
      if (globalCount > PRO_PLAN_SESSION_LIMIT) {
        userSockets.delete(socket);
        await redisService.decrementGlobalSession(userId, socket.id);
        socket.emit("error", {
          message: `Pro session limit reached (max ${PRO_PLAN_SESSION_LIMIT} active tabs). Please close an existing window.`,
        });
        socket.disconnect();
        return;
      }
    }

    // 4. If this is the FIRST global connection, notify presence
    if (globalCount === 1) {
      this.notifyStatusChange(userId, true);
    }

    // Register watchers so this user receives updates for their partners
    this._setupStatusWatchers(userId).catch((err) =>
      console.error("[SocketService] Failed to setup status watchers:", err),
    );

    // Fetch and send partners' status
    this.emitPartnersStatus(userId, socket).catch((err) =>
      console.error("[SocketService] Failed to emit partners status:", err),
    );

    socket.on("disconnect", async () => {
      userSockets?.delete(socket);
      await redisService.decrementGlobalSession(userId, socket.id);

      const remainingGlobal = await redisService.getGlobalSessionCount(userId);

      if (userSockets?.size === 0) {
        this.activeConnections.delete(userId);
        this._cleanupStatusWatchers(userId);
      }

      // If this was the LAST connection across all instances
      if (remainingGlobal === 0) {
        this.notifyStatusChange(userId, false);
      }
    });
  }

  /**
   * Track which partners this user cares about so we can route Pub/Sub updates.
   */
  private async _setupStatusWatchers(userId: string) {
    const partnerIds = await this._getPartnerIds(userId, true);
    const userPartners = new Set<string>();

    for (const partnerId of partnerIds) {
      let watchers = this.statusWatchers.get(partnerId);
      if (!watchers) {
        watchers = new Set();
        this.statusWatchers.set(partnerId, watchers);
      }
      watchers.add(userId);
      userPartners.add(partnerId);
    }
    this.userWatchedPartners.set(userId, userPartners);
  }

  private _cleanupStatusWatchers(userId: string) {
    const watchedPartners = this.userWatchedPartners.get(userId);
    if (!watchedPartners) return;

    for (const partnerId of watchedPartners) {
      const watchers = this.statusWatchers.get(partnerId);
      if (watchers) {
        watchers.delete(userId);
        if (watchers.size === 0) {
          this.statusWatchers.delete(partnerId);
        }
      }
    }
    this.userWatchedPartners.delete(userId);
  }

  // ─── Status & Presence ──────────────────────────────────────────────

  async emitPartnersStatus(userId: string, socket: TypedSocket) {
    try {
      const partnerIds = await this._getPartnerIds(userId);
      const partnerIdsArr = Array.from(partnerIds);

      // Check online status via Redis (Shared)
      const onlinePartners = await redisService.getOnlineUsers(partnerIdsArr);

      const offlinePartnerIds = partnerIdsArr.filter((id) => !onlinePartners.has(id));

      let offlineUserMap = new Map<string, Date>();
      if (offlinePartnerIds.length > 0) {
        const offlineUsers = await User.find({ _id: { $in: offlinePartnerIds } })
          .select("lastSeen")
          .lean();
        offlineUserMap = new Map(offlineUsers.map((u) => [u._id.toString(), u.lastSeen]));
      }

      for (const partnerId of partnerIdsArr) {
        const isOnline = onlinePartners.has(partnerId);
        let lastSeen: Date | null = null;

        if (!isOnline) {
          lastSeen = offlineUserMap.get(partnerId) || null;
        }

        socket.emit("user_status", { userId: partnerId, isOnline, lastSeen });
      }
    } catch (err) {
      console.error("Error emitting partners status:", err);
    }
  }

  async notifyStatusChange(userId: string, isOnline: boolean) {
    try {
      if (isOnline) {
        await redisService.setUserOnline(userId);
      } else {
        await redisService.setUserOffline(userId);
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      }

      // No need to manually iterate partners here anymore!
      // The _handleGlobalStatusUpdate (via Redis Pub/Sub) will handle it
      // across ALL server instances automatically.
    } catch (err) {
      console.error("Error notifying status change:", err);
    }
  }

  // ─── Typing Indicators ─────────────────────────────────────────────

  async handleTyping(
    sender: AuthenticatedSocketUser,
    payload: { receiverId: string; chatId: string },
    isTyping: boolean,
  ) {
    const senderId = sender.id;
    const { receiverId, chatId } = payload;
    if (!receiverId || !chatId) return;

    // Security: Prevent arbitrary users from flooding target room bindings unless they share an active chat
    const cached = this._getCachedParticipants(chatId);
    if (cached) {
      if (!cached.has(senderId) || !cached.has(receiverId)) return;
    } else {
      try {
        const chat = await Chat.findById(chatId).select("userA userB status").lean();
        if (!chat || chat.status !== "accepted") return;

        const participants = new Set([chat.userA.toString(), chat.userB.toString()]);
        if (!participants.has(senderId) || !participants.has(receiverId)) return;

        this._cacheParticipants(chatId, participants);
        // oxlint-disable-next-line no-unused-vars
      } catch (_e) {
        return;
      }
    }

    this.io?.to(`user:${receiverId}`).emit(isTyping ? "typing_start" : "typing_stop", {
      chatId,
      userId: senderId,
    });
  }

  // ─── Reactions ──────────────────────────────────────────────────────

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

      // Restrict actions on scrubbed messages
      if (isScrubbed(sender.plan, message.createdAt)) return;

      // Security: Check if user is part of the chat
      const senderIdStr = senderId.toString();
      const chatIdStr = message.chatId.toString();
      const cached = this._getCachedParticipants(chatIdStr);
      let isParticipant = false;

      if (cached) {
        isParticipant = cached.has(senderIdStr);
      } else {
        isParticipant = chat.userA.toString() === senderIdStr || chat.userB.toString() === senderIdStr;
        // Populate cache for future use
        this._cacheParticipants(chatIdStr, new Set([chat.userA.toString(), chat.userB.toString()]));
      }

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

  // ─── Message CRUD ───────────────────────────────────────────────────

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

    // 2. Proactively check participant cache for security/efficiency
    // If not cached, we'll rely on the atomic DB update filter below.
    const cached = this._getCachedParticipants(chatId);
    if (cached && !cached.has(senderId)) {
      throw AppError.forbidden("You are not a participant in this chat.");
    }

    // 3. Real-time Reliability Enforcer: Deduplication (Check before expensive DB write)
    const existingMessage = await this.Message.findOne({ idempotencyKey }).lean();
    if (existingMessage) {
      return {
        ...existingMessage,
        id: existingMessage._id.toString(),
        chatId: existingMessage.chatId.toString(),
        senderId: existingMessage.senderId.toString(),
        reactions: existingMessage.reactions?.map((r: any) => ({
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

    // 5. Atomic Chat Update & Verify (Combined 2 DB hits into 1)
    // This ensures: Chat exists, is accepted, and sender is a participant.
    const chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        status: "accepted",
        isDeleted: false,
        $or: [{ userA: senderId }, { userB: senderId }],
      },
      {
        lastMessage: {
          contentBody,
          senderId,
          sentAt: message.createdAt,
        },
        $inc: { [`unreadCounts.${receiverId}`]: 1 },
      },
      { new: true, lean: true },
    );

    if (!chat) {
      // Cleanup the dangling message if chat validation failed
      await this.Message.findByIdAndDelete(message._id);
      throw AppError.forbidden("Message delivery failed: Chat is invalid, rejected, or restricted.");
    }

    // Update cache if it was missing
    if (!cached) {
      this._cacheParticipants(chatId, new Set([chat.userA.toString(), chat.userB.toString()]));
    }

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
    const { messageId } = payload;
    if (!messageId) return;

    try {
      const result = await this._validateMessageModification(sender, messageId);
      if (!result) return;

      const { message, chat } = result;

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.contentBody = "This message was deleted";
      message.attachment = { kind: null, url: null };
      message.reactions = [];
      await message.save();

      const isLastMessage = this._isLastMessage(chat, message);

      // Determine participants and notify both
      const participants = [chat.userA.toString(), chat.userB.toString()];
      const updatePayload = {
        messageId: messageId.toString(),
        chatId: message.chatId.toString(),
        isLastMessage,
      };

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

  async handleEditMessage(sender: AuthenticatedSocketUser, payload: { messageId: string; contentBody: string }) {
    const { messageId, contentBody } = payload;
    if (!messageId || !contentBody?.trim()) return;

    try {
      const result = await this._validateMessageModification(sender, messageId);
      if (!result) return;

      const { message, chat } = result;

      message.contentBody = contentBody.trim();
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      const isLastMessage = this._isLastMessage(chat, message);

      // Determine participants and notify both
      const participants = [chat.userA.toString(), chat.userB.toString()];
      const updatePayload = {
        messageId: messageId.toString(),
        chatId: message.chatId.toString(),
        contentBody: message.contentBody,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
      };

      participants.forEach((uid) => {
        this.io?.to(`user:${uid}`).emit("message_updated", updatePayload);
      });

      // Update chat's lastMessage if it was this one
      if (isLastMessage) {
        chat.lastMessage.contentBody = message.contentBody;
        await chat.save();
      }
    } catch (err) {
      console.error("[SocketService] Error editing message:", err);
    }
  }
}

export const socketService = new SocketService(Message);
