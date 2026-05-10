import { RATE_LIMIT_DEFAULT_WINDOW_MS, RATE_LIMIT_SOCKET_MESSAGE_MAX, REACTIONS_MAX_UNIQUE } from "@config/env";
import { ChatRepository } from "@repositories/chat.repository";
import { MessageRepository } from "@repositories/message.repository";
import { messageService } from "@services/chat/message.service";
import { redisGuardService } from "@services/infra/redis.service";
import { isScrubbed } from "@utils/date.utils";
import { getCanonicalSlug } from "@utils/emoji.utils";
import { CHAT_EVENTS, eventBus } from "@utils/event-bus";
import { Types } from "mongoose";
import { MessageReactionUpdateDto } from "shared/types/chat.dto";
import { getDisallowedEmojis } from "shared/utils/emoji";

import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class ReactionHandler {
  constructor(
    private ioProvider: () => TypedIO | null,
    private chatRepo: ChatRepository,
    private messageRepo: MessageRepository,
  ) {}

  async handleReaction(sender: AuthenticatedSocketUser, payload: { messageId: string; emoji: string; slug?: string }) {
    const { messageId, emoji, slug } = payload;
    const io = this.ioProvider();

    // -1. Block disallowed emojis
    if (getDisallowedEmojis(emoji).length > 0) return;

    // 0. Rate limit
    const rlStatus = await redisGuardService.incrementAndCheckLimit(
      `rl:socket:reaction:${sender.id}`,
      RATE_LIMIT_SOCKET_MESSAGE_MAX,
      RATE_LIMIT_DEFAULT_WINDOW_MS,
    );

    if (!rlStatus.allowed) {
      io?.to(`user:${sender.id}`).emit("error", {
        message: "You are reacting too fast. Please slow down.",
        code: "RATE_LIMIT_EXCEEDED",
      });
      return;
    }

    try {
      const message = await this.messageRepo.findById(messageId);
      if (!message) return;

      const chat = await this.chatRepo.findById(message.chatId);
      if (!chat) return;

      if (isScrubbed(sender.plan, message.createdAt)) return;

      const senderIdStr = sender.id;
      const chatIdStr = message.chatId.toString();

      // Use shared participant cache from messageService
      await messageService.ensureParticipant(chatIdStr, senderIdStr);

      const senderIdIdx = new Types.ObjectId(sender.id);
      const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

      let action: "added" | "removed" | null = null;
      const canonicalSlug = getCanonicalSlug(emoji, slug);

      if (reactionIndex > -1) {
        const reactionGroup = message.reactions[reactionIndex];
        const userIndex = reactionGroup.users.findIndex((u) => u.toString() === senderIdStr);

        if (userIndex > -1) {
          action = "removed";
          reactionGroup.users.splice(userIndex, 1);
          if (reactionGroup.users.length === 0) {
            message.reactions.splice(reactionIndex, 1);
          }
        } else {
          action = "added";
          reactionGroup.users.push(senderIdIdx);
          if (
            canonicalSlug &&
            (!reactionGroup.slug || reactionGroup.slug === "emoji" || reactionGroup.slug !== canonicalSlug)
          ) {
            reactionGroup.slug = canonicalSlug;
          }
        }
      } else if (message.reactions.length < REACTIONS_MAX_UNIQUE) {
        action = "added";
        message.reactions.push({
          emoji,
          slug: canonicalSlug,
          users: [senderIdIdx],
        });
      }

      if (!action) return;

      message.markModified("reactions");
      await message.save();

      const updatePayload: MessageReactionUpdateDto = {
        messageId: messageId.toString(),
        chatId: chatIdStr,
        reaction: {
          action: action as "added" | "removed",
          emoji,
          slug: canonicalSlug,
          userId: senderIdStr,
        },
      };

      eventBus.emit(CHAT_EVENTS.REACTION_UPDATED, {
        payload: updatePayload,
        participants: chat.participants.map((p: any) => p.toString()),
      });
    } catch (err) {
      console.error("[ReactionHandler] Error:", err);
    }
  }
}
