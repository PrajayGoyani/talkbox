import { ChatRepository, chatRepository } from "@repositories/chat.repository";
import { MessageRepository, messageRepository } from "@repositories/message.repository";
import { UserRepository, userRepository } from "@repositories/user.repository";
import { messageService } from "@services/chat/message.service";
import { policyService } from "@services/policy.service";
import { PresenceService } from "@services/presence.service";
import { redisService } from "@services/redis.service";
import { MessageHandler } from "@services/socket-handlers/message.handler";
import { ReactionHandler } from "@services/socket-handlers/reaction.handler";
import { TypingHandler } from "@services/socket-handlers/typing.handler";
import { eventBus, USER_EVENTS } from "@utils/event-bus";
import { LRUCache } from "lru-cache";

import { AuthenticatedSocketUser, TypedIO, TypedSocket } from "@/types/socket.types";

const PARTICIPANT_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const PARTICIPANT_CACHE_MAX = 500;
const PARTNER_CACHE_TTL_MS = 1000 * 60 * 5;
const PARTNER_CACHE_MAX = 1000;

export class SocketService {
  public io: TypedIO | null = null;
  public activeConnections: Map<string, Set<TypedSocket>> = new Map();

  private participantCache: LRUCache<string, Set<string>>;
  private partnerCache: LRUCache<string, Set<string>>;
  private partnerRequests: Map<string, Promise<Set<string>>> = new Map();

  private presenceService: PresenceService;
  private messageHandler: MessageHandler;
  private reactionHandler: ReactionHandler;
  private typingHandler: TypingHandler;

  constructor(
    private chatRepo: ChatRepository,
    private messageRepo: MessageRepository,
    private userRepo: UserRepository,
  ) {
    const ioProvider = () => this.io;

    this.presenceService = new PresenceService(ioProvider, this.userRepo);
    this.messageHandler = new MessageHandler(ioProvider);
    this.reactionHandler = new ReactionHandler(ioProvider, this.chatRepo, this.messageRepo);
    this.typingHandler = new TypingHandler(ioProvider, this.chatRepo);

    // decalre constant and use
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
    void socket.join(`user:${userId}`);

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

    if (globalCount > 1 && plan === "free") {
      const victims = await redisService.takeoverFreeSession(userId, socket.id);
      for (const victimId of victims) {
        await redisService.publishSessionTakeover(userId, victimId);
        this._handleGlobalTakeover(userId, victimId);
      }
    } else if (policyService.isSessionLimitReached(plan, globalCount)) {
      const victimId = await redisService.getOldestSession(userId);
      if (victimId) {
        await redisService.publishSessionTakeover(userId, victimId);
        this._handleGlobalTakeover(userId, victimId);
      }
    }

    if (globalCount === 1) {
      await this.presenceService.notifyStatusChange(userId, true);
    }

    const partnerIds = await this._getPartnerIds(userId);
    if (partnerIds.size > 0) {
      partnerIds.forEach((pId) => socket.join(`watching:${pId}`));
      await this.presenceService.emitPartnersStatus(userId, socket, partnerIds);
    }
    // Join rooms for all accepted chats to receive transient events like typing
    const chats = await this.chatRepo.findPartnerChats(userId, true);
    chats.forEach((c) => socket.join(`watching:${c._id.toString()}`));
  }

  async notifyProfileUpdate(userId: string, profile: any) {
    const io = this.io;
    io?.to(`watching:${userId}`).emit("profile_updated", { userId, ...profile });
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
    return messageService.markChatRead(chatId, userId);
  }

  private _handleGlobalCacheInvalidation(type: string, id: string) {
    if (type === "chat") {
      this.participantCache.delete(id);
      this.partnerCache.clear();
      messageService.invalidateCache(id);
    } else if (type === "partner") {
      this.partnerCache.delete(id);
      chatRepository.invalidatePartnerCache(id);
    }
  }
  // ─── Internal Helpers ─────────────────────────────────────────────

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

        const chats = await this.chatRepo.findPartnerChats(userId, excludeDeleted);
        const partners = new Set<string>();
        for (const chat of chats) {
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
}

export const socketService = new SocketService(chatRepository, messageRepository, userRepository);
