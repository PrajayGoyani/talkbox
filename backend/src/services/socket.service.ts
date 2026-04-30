import { PRO_PLAN_SESSION_LIMIT } from "@config/env";
import Chat from "@models/chat.model";
import { PresenceService } from "@services/presence.service";
import { redisService } from "@services/redis.service";
import { MessageHandler } from "@services/socket-handlers/message.handler";
import { ReactionHandler } from "@services/socket-handlers/reaction.handler";
import { TypingHandler } from "@services/socket-handlers/typing.handler";
import { LRUCache } from "lru-cache";

import { AuthenticatedSocketUser, MessageDto, TypedIO, TypedSocket } from "@/types/socket.types";

const PARTICIPANT_CACHE_TTL_MS = 10 * 60 * 1000;
const PARTICIPANT_CACHE_MAX = 10000;

const PARTNER_CACHE_TTL_MS = 15 * 60 * 1000;
const PARTNER_CACHE_MAX = 10000;

export class SocketService {
  public io: TypedIO | null = null;
  public activeConnections: Map<string, Set<TypedSocket>> = new Map();

  private participantCache: LRUCache<string, any>;
  private partnerCache: LRUCache<string, Set<string>>;
  private partnerRequests: Map<string, Promise<Set<string>>> = new Map();

  private presenceService: PresenceService;
  private messageHandler: MessageHandler;
  private reactionHandler: ReactionHandler;
  private typingHandler: TypingHandler;

  constructor() {
    const ioProvider = () => this.io;

    this.presenceService = new PresenceService(ioProvider);
    this.messageHandler = new MessageHandler(ioProvider);
    this.reactionHandler = new ReactionHandler(ioProvider);
    this.typingHandler = new TypingHandler(ioProvider);

    this.participantCache = new LRUCache({
      max: PARTICIPANT_CACHE_MAX,
      ttl: PARTICIPANT_CACHE_TTL_MS,
    });
    this.partnerCache = new LRUCache({
      max: PARTNER_CACHE_MAX,
      ttl: PARTNER_CACHE_TTL_MS,
    });
  }

  init(io: TypedIO) {
    this.io = io;

    if (redisService.subClient) {
      redisService.subClient.subscribe("presence:updates", "cache:invalidate", "session:takeover");
      redisService.subClient.on("message", (channel, message) => {
        try {
          const data = JSON.parse(message);
          switch (channel) {
            case "presence:updates":
              this.presenceService.handleGlobalStatusUpdate(data.userId, data.isOnline);
              break;
            case "cache:invalidate":
              this._handleGlobalCacheInvalidation(data.type, data.id);
              break;
            case "session:takeover":
              this._handleGlobalTakeover(data.userId, data.victimSocketId);
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

    const globalCount = await redisService.incrementGlobalSession(userId, socket.id);

    let userSockets = this.activeConnections.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      this.activeConnections.set(userId, userSockets);
    }
    userSockets.add(socket);
    socket.join(`user:${userId}`);

    // Register disconnect listener EARLIER to prevent leaks on initialization errors
    socket.on("disconnect", async () => {
      userSockets?.delete(socket);
      await redisService.decrementGlobalSession(userId, socket.id);

      const remainingGlobal = await redisService.getGlobalSessionCount(userId);
      if (userSockets?.size === 0) {
        this.activeConnections.delete(userId);
      }

      if (remainingGlobal === 0) {
        await this.presenceService.notifyStatusChange(userId, false);
      }
    });

    if (plan === "free") {
      const victims = await redisService.takeoverFreeSession(userId, socket.id);
      if (victims.length > 0) {
        for (const victimId of victims) {
          await redisService.publishSessionTakeover(userId, victimId);
          this._handleGlobalTakeover(userId, victimId);
        }
      }
    } else if (plan === "pro" && globalCount > PRO_PLAN_SESSION_LIMIT) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        this.activeConnections.delete(userId);
      }

      await redisService.decrementGlobalSession(userId, socket.id);
      socket.emit("error", {
        message: `Pro session limit reached (max ${PRO_PLAN_SESSION_LIMIT} active tabs).`,
      });
      socket.disconnect();
      return;
    }

    if (globalCount === 1) {
      await this.presenceService.notifyStatusChange(userId, true);
    }

    // Watchers & Status: Join rooms for all partners and request initial status
    const partnerIds = await this._getPartnerIds(userId, true);
    partnerIds.forEach((pid) => socket.join(`watching:${pid}`));

    await this.presenceService.emitPartnersStatus(userId, socket, await this._getPartnerIds(userId));
  }

  // ─── Delegates ─────────────────────────────────────────────────────

  async handleTyping(sender: AuthenticatedSocketUser, payload: any, isTyping: boolean) {
    return this.typingHandler.handleTyping(
      sender,
      payload,
      isTyping,
      (id) => this.participantCache.get(id),
      (id, p) => this.participantCache.set(id, p),
    );
  }

  async handleReaction(sender: AuthenticatedSocketUser, payload: any) {
    return this.reactionHandler.handleReaction(
      sender,
      payload,
      (id) => this.participantCache.get(id),
      (id, p) => this.participantCache.set(id, p),
    );
  }

  async saveAndDeliverMessage(sender: AuthenticatedSocketUser, payload: any): Promise<MessageDto> {
    return this.messageHandler.saveAndDeliver(
      sender,
      payload,
      (id) => this.participantCache.get(id),
      (id, p) => this.participantCache.set(id, p),
    );
  }

  async handleDeleteMessage(sender: AuthenticatedSocketUser, payload: any) {
    return this.messageHandler.handleDelete(sender, payload.messageId);
  }

  async handleEditMessage(sender: AuthenticatedSocketUser, payload: any) {
    return this.messageHandler.handleEdit(sender, payload.messageId, payload.contentBody);
  }

  /**
   * Broadcast profile updates (name, avatar, bio, plan) to all partners
   * who are currently watching this user (i.e., have an active chat).
   */
  public async notifyProfileUpdate(userId: string, updates: Partial<AuthenticatedSocketUser>) {
    if (this.io) {
      this.io.to(`watching:${userId}`).emit("profile_updated", { userId, ...updates });
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private async _getPartnerIds(userId: string, excludeDeleted = false): Promise<Set<string>> {
    const cacheKey = excludeDeleted ? `${userId}:active` : userId;
    const l1Cached = this.partnerCache.get(cacheKey);
    if (l1Cached) return l1Cached;

    // Thundering Herd Protection: check if a request for this key is already in flight
    const inFlight = this.partnerRequests.get(cacheKey);
    if (inFlight) return inFlight;

    const fetchPromise = (async () => {
      try {
        const l2Cached = await redisService.getCachedPartners(userId, excludeDeleted);
        if (l2Cached) {
          this.partnerCache.set(cacheKey, l2Cached);
          return l2Cached;
        }

        const filter: any = { participants: userId, status: "accepted" };
        if (excludeDeleted) filter.isDeleted = false;

        const chats = await Chat.find(filter).select("participants").lean();
        const partners = new Set<string>();
        for (const chat of chats as any) {
          for (const p of chat.participants) {
            const pId = p.toString();
            if (pId !== userId) {
              partners.add(pId);
            }
          }
        }

        this.partnerCache.set(cacheKey, partners);
        await redisService.setCachedPartners(userId, Array.from(partners), excludeDeleted);
        return partners;
      } finally {
        // Always clear the in-flight promise when done
        this.partnerRequests.delete(cacheKey);
      }
    })();

    this.partnerRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  public async invalidatePartnerCache(userId: string): Promise<void> {
    this.partnerCache.delete(userId);
    this.partnerCache.delete(`${userId}:active`);
    await redisService.invalidatePartnerCache(userId);
    if (redisService.client && redisService.isConnected) {
      await redisService.client.publish("cache:invalidate", JSON.stringify({ type: "partner", id: userId }));
    }
  }

  private _handleGlobalTakeover(userId: string, victimSocketId?: string) {
    const userSockets = this.activeConnections.get(userId);
    if (!userSockets) return;

    // Use a copy for safe iteration while deleting
    // If victimSocketId is provided, we only disconnect that specific socket.
    // If NOT provided, we kick everyone (fallback/safety).
    const socketsToDisconnect = Array.from(userSockets).filter((s) => !victimSocketId || s.id === victimSocketId);

    socketsToDisconnect.forEach((s) => {
      s.emit("session_error", { reason: "takeover", message: "Session opened in another window." });
      s.disconnect();
      userSockets.delete(s);
    });

    if (userSockets.size === 0) {
      this.activeConnections.delete(userId);
    }
  }

  private _handleGlobalCacheInvalidation(type: string, id: string) {
    if (type === "partner") {
      this.partnerCache.delete(id);
      this.partnerCache.delete(`${id}:active`);
    } else if (type === "chat") {
      this.participantCache.delete(id);
    }
  }
}

export const socketService = new SocketService();
