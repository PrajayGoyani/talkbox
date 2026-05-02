import { RATE_LIMIT_DEFAULT_WINDOW_MS } from "@config/env";
import { ChatRepository } from "@repositories/chat.repository";
import { messageService } from "@services/chat/message.service";
import { redisService } from "@services/redis.service";
import { TypingIndicatorDto } from "@shared/types/chat.dto";
import { LRUCache } from "lru-cache";

import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class TypingHandler {
  private localGuard = new LRUCache<string, number>({
    max: 10000,
    ttl: 2000,
  });

  constructor(
    private ioProvider: () => TypedIO | null,
    private chatRepo: ChatRepository,
  ) {}

  async handleTyping(
    sender: AuthenticatedSocketUser,
    payload: { receiverId: string; chatId: string },
    isTyping: boolean,
  ) {
    const senderId = sender.id;
    const { receiverId, chatId } = payload;
    if (!receiverId || !chatId) return;

    // 0. Local guard: best-effort reduction of Redis hits
    const now = Date.now();
    const lastCheck = this.localGuard.get(senderId) || 0;
    const shouldHitRedis = now - lastCheck > 2000;

    if (shouldHitRedis) {
      const rlStatus = await redisService.incrementAndCheckLimit(
        `rl:socket:typing:${senderId}`,
        60,
        RATE_LIMIT_DEFAULT_WINDOW_MS,
      );
      if (!rlStatus.allowed) return;
      this.localGuard.set(senderId, now);
    }

    try {
      await messageService.ensureParticipant(chatId, senderId);

      const io = this.ioProvider();
      const typingPayload: TypingIndicatorDto = {
        chatId,
        userId: senderId,
      };

      // Typing is transient, so we emit directly to the watching room
      io?.to(`watching:${chatId}`).emit(isTyping ? "typing_start" : "typing_stop", typingPayload);
    } catch {
      return;
    }
  }
}
