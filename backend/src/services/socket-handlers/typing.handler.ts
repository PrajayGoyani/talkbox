import { RATE_LIMIT_DEFAULT_WINDOW_MS } from "@config/env";
import Chat from "@models/chat.model";
import { redisService } from "@services/redis.service";
import { LRUCache } from "lru-cache";

import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class TypingHandler {
  private localGuard = new LRUCache<string, number>({
    max: 10000,
    ttl: 2000,
  });

  constructor(private ioProvider: () => TypedIO | null) {}

  async handleTyping(
    sender: AuthenticatedSocketUser,
    payload: { receiverId: string; chatId: string },
    isTyping: boolean,
    checkCache: (chatId: string) => Set<string> | null | undefined,
    updateCache: (chatId: string, participants: Set<string> | null) => void,
  ) {
    const senderId = sender.id;
    const { receiverId, chatId } = payload;
    if (!receiverId || !chatId) return;

    // 0. Local guard: best-effort reduction of Redis hits
    // Only hit Redis at most once every 2 seconds per user for typing
    const now = Date.now();
    const lastCheck = this.localGuard.get(senderId) || 0;
    const shouldHitRedis = now - lastCheck > 2000;

    if (shouldHitRedis) {
      // 0. Redis Rate limit: 60 per minute
      const isAllowed = await redisService.incrementAndCheckLimit(
        `rl:socket:typing:${senderId}`,
        60,
        RATE_LIMIT_DEFAULT_WINDOW_MS,
      );
      if (!isAllowed) return;
      this.localGuard.set(senderId, now);
    }

    // 1. Participant Security
    const cached = checkCache(chatId);
    let participantSet: Set<string>;

    if (cached) {
      if (!cached.has(senderId)) return;
      participantSet = cached;
    } else {
      try {
        const chat = await Chat.findById(chatId).select("participants status").lean();
        if (!chat || chat.status !== "accepted") {
          updateCache(chatId, null);
          return;
        }

        participantSet = new Set(chat.participants.map((p: any) => p.toString()));
        if (!participantSet.has(senderId)) return;

        updateCache(chatId, participantSet);
      } catch (_e) {
        updateCache(chatId, null);
        return;
      }
    }

    const io = this.ioProvider();
    for (const pId of participantSet) {
      if (pId !== senderId) {
        io?.to(`user:${pId}`).emit(isTyping ? "typing_start" : "typing_stop", {
          chatId,
          userId: senderId,
        });
      }
    }
  }
}
