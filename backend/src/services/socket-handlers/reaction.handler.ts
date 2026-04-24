import { REACTIONS_MAX_UNIQUE, RATE_LIMIT_SOCKET_MESSAGE_MAX, RATE_LIMIT_DEFAULT_WINDOW_MS } from "@config/env";
import Chat from "@models/chat.model";
import Message from "@models/message.model";
import { redisService } from "@services/redis.service";
import { isScrubbed } from "@utils/date.utils";
import { getCanonicalSlug } from "@utils/emoji.utils";
import { Types } from "mongoose";

import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class ReactionHandler {
  constructor(private ioProvider: () => TypedIO | null) {}

  async handleReaction(
    sender: AuthenticatedSocketUser,
    payload: { messageId: string; emoji: string; slug?: string },
    checkCache: (chatId: string) => Set<string> | null | undefined,
    updateCache: (chatId: string, participants: Set<string> | null) => void,
  ) {
    const { messageId, emoji, slug } = payload;
    const io = this.ioProvider();

    // 0. Rate limit
    const isAllowed = await redisService.incrementAndCheckLimit(
      `rl:socket:reaction:${sender.id}`,
      RATE_LIMIT_SOCKET_MESSAGE_MAX,
      RATE_LIMIT_DEFAULT_WINDOW_MS,
    );

    if (!isAllowed) {
      io?.to(`user:${sender.id}`).emit("error", {
        message: "You are reacting too fast. Please slow down.",
        code: "RATE_LIMIT_EXCEEDED",
      });
      return;
    }

    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const chat = await Chat.findById(message.chatId);
      if (!chat) return;

      if (isScrubbed(sender.plan, message.createdAt)) return;

      const senderIdStr = sender.id;
      const chatIdStr = message.chatId.toString();
      const cached = checkCache(chatIdStr);
      let isParticipant = false;

      if (cached) {
        isParticipant = cached.has(senderIdStr);
      } else {
        isParticipant = chat.userA.toString() === senderIdStr || chat.userB.toString() === senderIdStr;
        updateCache(chatIdStr, new Set([chat.userA.toString(), chat.userB.toString()]));
      }

      if (!isParticipant) return;

      const senderIdIdx = new Types.ObjectId(sender.id);
      const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

      if (reactionIndex > -1) {
        const reactionGroup = message.reactions[reactionIndex];
        const userIndex = reactionGroup.users.findIndex((u) => u.toString() === senderIdStr);

        if (userIndex > -1) {
          reactionGroup.users.splice(userIndex, 1);
          if (reactionGroup.users.length === 0) {
            message.reactions.splice(reactionIndex, 1);
          }
        } else {
          reactionGroup.users.push(senderIdIdx);
          const canonicalSlug = getCanonicalSlug(emoji, slug);
          if (
            canonicalSlug &&
            (!reactionGroup.slug || reactionGroup.slug === "emoji" || reactionGroup.slug !== canonicalSlug)
          ) {
            reactionGroup.slug = canonicalSlug;
          }
        }
      } else if (message.reactions.length < REACTIONS_MAX_UNIQUE) {
        message.reactions.push({
          emoji,
          slug: getCanonicalSlug(emoji, slug),
          users: [senderIdIdx],
        });
      }

      message.markModified("reactions");
      await message.save();

      const receiverId = chat.userA.toString() === senderIdStr ? chat.userB.toString() : chat.userA.toString();
      const savedMessage = message.toObject();
      const updatePayload = {
        messageId: messageId.toString(),
        chatId: chatIdStr,
        reactions: savedMessage.reactions.map((r: any) => ({
          emoji: r.emoji,
          slug: r.slug,
          users: r.users.map((u: any) => u.toString()),
        })),
      };

      io?.to(`user:${senderIdStr}`).emit("message_reaction_update", updatePayload);
      io?.to(`user:${receiverId}`).emit("message_reaction_update", updatePayload);
    } catch (err) {
      console.error("[ReactionHandler] Error:", err);
    }
  }
}
