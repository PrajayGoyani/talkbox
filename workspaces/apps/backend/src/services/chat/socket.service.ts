import { IChatQueryRepository } from "@repositories/interfaces/chat-query.repository";
import { IChatRepository } from "@repositories/interfaces/chat.repository";
import { IMessageRepository } from "@repositories/interfaces/message.repository";
import { IUserRepository } from "@repositories/interfaces/user.repository";
import { IMessageService } from "@services/chat/types";
import { IRedisPresenceService, IRedisSessionService, IRedisBaseService } from "@services/infra/interfaces";
import { IChatCacheService } from "@services/interfaces/chat-cache.service";
import { IPolicyService } from "@services/interfaces/policy.service";
import { PresenceService } from "@services/presence/presence.service";
import { MessageHandler } from "@services/socket-handlers/message.handler";
import { ReactionHandler } from "@services/socket-handlers/reaction.handler";
import { TypingHandler } from "@services/socket-handlers/typing.handler";
import { eventBus, USER_EVENTS } from "@utils/event-bus";

import { AuthenticatedSocketUser, TypedIO, TypedSocket } from "@/types/socket.types";

export class SocketService {
  public io: TypedIO | null = null;
  public activeConnections: Map<string, Set<TypedSocket>> = new Map();

  private partnerRequests: Map<string, Promise<Set<string>>> = new Map();

  constructor(
    private chatRepo: IChatRepository,
    private messageRepo: IMessageRepository,
    private userRepo: IUserRepository,
    private chatQueryRepo: IChatQueryRepository,
    private messageService: IMessageService,
    private presenceService: PresenceService,
    private messageHandler: MessageHandler,
    private reactionHandler: ReactionHandler,
    private typingHandler: TypingHandler,
    private redisSessionService: IRedisSessionService,
    private redisPresenceService: IRedisPresenceService,
    private redisBaseService: IRedisBaseService,
    private policyService: IPolicyService,
    private chatCacheService: IChatCacheService,
  ) {}

  init(io: TypedIO) {
    this.io = io;

    if (this.redisBaseService.subClient) {
      this.redisBaseService.subClient.subscribe(
        "presence:updates",
        "cache:invalidate",
        "session:takeover",
        "session:logout",
      );
      this.redisBaseService.subClient.on("message", (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          switch (channel) {
            case "presence:updates":
              eventBus.emit(USER_EVENTS.PRESENCE_CHANGED, {
                userId: data.userId,
                isOnline: data.isOnline,
              });
              break;
            case "cache:invalidate":
              this._handleGlobalCacheInvalidation(data.type, data.id);
              break;
            case "session:takeover":
              this._handleGlobalTakeover(data.userId, data.victimSocketId);
              break;
            case "session:logout":
              this._handleGlobalLogout(data.userId);
              break;
          }
        } catch (err) {
          console.error(`[SocketService] Error processing Redis message on ${channel}:`, err);
        }
      });
    }
  }

  // ─── Connection Management ──────────────────────────────────────────

  async handleConnection(socket: TypedSocket) {
    const userId = socket.data.user.id;
    const plan = socket.data.user.plan;

    const globalCount = await this.redisSessionService.incrementGlobalSession(userId, socket.id);

    let userSockets = this.activeConnections.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      this.activeConnections.set(userId, userSockets);
    }
    userSockets.add(socket);
    void socket.join(`user:${userId}`);

    socket.on("disconnect", async () => {
      userSockets?.delete(socket);
      await this.redisSessionService.decrementGlobalSession(userId, socket.id);

      const remainingGlobal = await this.redisSessionService.getGlobalSessionCount(userId);
      if (userSockets?.size === 0) {
        this.activeConnections.delete(userId);
      }

      if (remainingGlobal === 0) {
        await this.presenceService.notifyStatusChange(userId, false);
      }
    });

    if (globalCount > 1 && plan === "free") {
      const victims = await this.redisSessionService.takeoverFreeSession(userId, socket.id);
      for (const victimId of victims) {
        await this.redisSessionService.publishSessionTakeover(userId, victimId);
        this._handleGlobalTakeover(userId, victimId);
      }
    } else if (this.policyService.isSessionLimitReached(plan, globalCount)) {
      const victimId = await this.redisSessionService.getOldestSession(userId);
      if (victimId) {
        await this.redisSessionService.publishSessionTakeover(userId, victimId);
        this._handleGlobalTakeover(userId, victimId);
      }
    }

    if (globalCount === 1) {
      await this.presenceService.notifyStatusChange(userId, true);
    }

    // Synchronize watching rooms for partners and chats
    await this._syncWatchingRooms(userId, userSockets);
  }

  // ─── Emission Methods ──────────────────────────────────────────

  /**
   * Emit to a specific user. Bypasses Redis when user is local-only.
   */
  async emitToUser(userId: string, event: string, data: unknown): Promise<void> {
    await this._emitInternal(userId, event, data);
  }

  /**
   * Emit to multiple users in parallel.
   */
  async emitToUsers(userIds: string[], event: string, data: unknown): Promise<void> {
    if (userIds.length === 0) return;
    await Promise.all(userIds.map((userId) => this._emitInternal(userId, event, data)));
  }

  private async _emitInternal(userId: string, event: string, data: unknown): Promise<void> {
    const localSockets = this.activeConnections.get(userId);

    // Smart Local Routing: If user is only on this instance, bypass Redis
    if (localSockets && localSockets.size > 0) {
      const globalCount = await this.redisSessionService.getGlobalSessionCount(userId);
      if (globalCount === localSockets.size) {
        localSockets.forEach((socket) => this._rawEmit(socket, event, data));
        return;
      }
    }

    // Fallback to global broadcast via Redis adapter
    this._rawEmit(this.io, event, data, `user:${userId}`);
  }

  /**
   * Internal helper to handle brittle type casts for Socket.IO emissions
   */
  private _rawEmit(target: TypedIO | TypedSocket | null, event: string, data: unknown, room?: string): void {
    if (!target) return;

    if (room) {
      // Handle IO broadcast to room
      (target as unknown as { to: (r: string) => { emit: (e: string, d: unknown) => void } })
        .to(room)
        .emit(event, data);
    } else {
      // Handle direct socket/IO emit
      (target as unknown as { emit: (e: string, d: unknown) => void }).emit(event, data);
    }
  }

  async notifyProfileUpdate(userId: string, profile: import("shared/types/chat.dto").ProfileUpdateDto) {
    const io = this.io;
    io?.to(`watching:${userId}`).emit("profile_updated", { ...profile });
  }

  private _handleGlobalTakeover(userId: string, victimSocketId?: string) {
    const userSockets = this.activeConnections.get(userId);
    if (!userSockets) return;

    // Use an array to avoid modification-during-iteration issues
    const socketsToKick = Array.from(userSockets).filter((s) => !victimSocketId || s.id === victimSocketId);

    for (const socket of socketsToKick) {
      socket.emit("session_error", {
        reason: "takeover",
        message: "You have been logged out because you signed in on another device.",
      });
      socket.disconnect();
      userSockets.delete(socket);
    }

    if (userSockets.size === 0) {
      this.activeConnections.delete(userId);
    }
  }

  private _handleGlobalLogout(userId: string) {
    const userSockets = this.activeConnections.get(userId);
    if (!userSockets) return;

    const socketsToKick = Array.from(userSockets);
    for (const socket of socketsToKick) {
      socket.emit("session_error", {
        reason: "logout",
        message: "You have been logged out.",
      });
      socket.disconnect();
      userSockets.delete(socket);
    }

    this.activeConnections.delete(userId);
  }

  // ─── Message Operations ──────────────────────────────────────────

  async saveAndDeliverMessage(
    sender: AuthenticatedSocketUser,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
  ) {
    return this.messageHandler.saveAndDeliver(sender, payload);
  }

  async handleReaction(sender: AuthenticatedSocketUser, payload: { messageId: string; emoji: string; slug?: string }) {
    return this.reactionHandler.handleReaction(sender, payload);
  }

  async handleDeleteMessage(sender: AuthenticatedSocketUser, payload: { messageId: string }) {
    return this.messageHandler.handleDelete(sender, payload.messageId);
  }

  async handleEditMessage(sender: AuthenticatedSocketUser, payload: { messageId: string; contentBody: string }) {
    return this.messageHandler.handleEdit(sender, payload.messageId, payload.contentBody);
  }

  async handleTyping(
    sender: AuthenticatedSocketUser,
    payload: { receiverId: string; chatId: string },
    isTyping: boolean,
  ) {
    return this.typingHandler.handleTyping(sender, payload, isTyping);
  }
  async handleMarkAsRead(userId: string, chatId: string) {
    return this.messageService.markChatRead(chatId, userId);
  }

  private async _handleGlobalCacheInvalidation(type: string, id: string) {
    if (type === "chat") {
      this.chatCacheService.invalidateParticipants(id);
      this.messageService.invalidateCache(id);
    } else if (type === "partner") {
      this.chatCacheService.invalidatePartners(id);

      const sockets = this.activeConnections.get(id);
      if (sockets && sockets.size > 0) {
        await this._syncWatchingRooms(id, sockets);
      }
    }
  }
  // ─── Internal Helpers ─────────────────────────────────────────────

  private async _syncWatchingRooms(userId: string, sockets?: Set<TypedSocket>) {
    if (!sockets || sockets.size === 0) return;
    try {
      const partnerIds = await this._getPartnerIds(userId);
      const chats = await this.chatQueryRepo.findPartnerChats(userId, true);
      for (const socket of sockets) {
        if (partnerIds.size > 0) {
          partnerIds.forEach((pId) => socket.join(`watching:${pId}`));
        }
        chats.forEach((c) => socket.join(`watching:${c._id.toString()}`));
      }
      // 4. Emit current status batch for all partners to all sockets at once
      if (partnerIds.size > 0) {
        const batch = await this.presenceService.getPartnersStatusBatch(userId, partnerIds);
        if (batch.length > 0) {
          this.io?.to(`user:${userId}`).emit("user_status_batch", batch);
        }
      }
    } catch (err) {
      console.error(`[SocketService] Error syncing watching rooms for ${userId}:`, err);
    }
  }

  private async _getPartnerIds(userId: string, excludeDeleted = false): Promise<Set<string>> {
    const cacheKey = excludeDeleted ? `${userId}:active` : userId;
    const l1Cached = this.chatCacheService.getPartners(userId, excludeDeleted);
    if (l1Cached) return l1Cached;

    // Thundering Herd Protection: check if a request for this key is already in flight
    const inFlight = this.partnerRequests.get(cacheKey);
    if (inFlight) return inFlight;

    const fetchPromise = (async () => {
      try {
        const l2Cached = await this.redisPresenceService.getCachedPartners(userId, excludeDeleted);
        if (l2Cached) {
          this.chatCacheService.setPartners(userId, l2Cached, excludeDeleted);
          return l2Cached;
        }

        const chats = await this.chatQueryRepo.findPartnerChats(userId, excludeDeleted);
        const partners = new Set<string>();
        for (const chat of chats) {
          for (const p of chat.participants) {
            const pId = p.toString();
            if (pId !== userId) {
              partners.add(pId);
            }
          }
        }

        this.chatCacheService.setPartners(userId, partners, excludeDeleted);
        await this.redisPresenceService.setCachedPartners(userId, Array.from(partners), excludeDeleted);
        return partners;
      } catch (err) {
        console.error(`[SocketService] Failed to fetch partners for ${userId}:`, err);
        throw err;
      } finally {
        // Always clear the in-flight promise when done
        this.partnerRequests.delete(cacheKey);
      }
    })();

    this.partnerRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }
}
