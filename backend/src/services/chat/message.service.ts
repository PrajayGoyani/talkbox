import Chat from "@models/chat.model";
import Message from "@models/message.model";
import { AppError } from "@utils/AppError";
import { getScrubCutoff } from "@utils/date.utils";
import { extractEmojiMetadata } from "@utils/emoji.utils";
import { ObjectId } from "mongodb";

import { MessageDto } from "@/types/socket.types";

import { IMessageService } from "./types";

export class MessageService implements IMessageService {
  async getChatMessages(
    chatId: string | ObjectId,
    userId: string,
    limit: number = 50,
    cursor: string | null = null,
    plan: "free" | "pro" = "free",
  ): Promise<MessageDto[]> {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }
    if (chat.status !== "accepted") {
      throw AppError.forbidden("Chat must be accepted before viewing messages");
    }

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not part of this chat");
    }

    const query: any = { chatId: chat._id };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query).sort({ _id: -1 }).limit(limit);
    const scrubCutoff = getScrubCutoff();

    const transformed = messages.map((m) => {
      const msg = m.toObject();
      const isOlderThanLimit = m.createdAt < scrubCutoff;

      if (msg.isDeleted) {
        msg.contentBody = "This message was deleted";
        msg.reactions = [];
        msg.attachment = { kind: null, url: null };
      } else if (plan === "free" && isOlderThanLimit) {
        msg.contentBody = "Message unavailable on Free plan.";
        msg.reactions = [];
        msg.attachment = { kind: null, url: null };
        msg.isScrubbed = true;
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

  async markChatRead(chatId: string | ObjectId, userId: string | ObjectId): Promise<{ message: string }> {
    const result = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        participants: userId,
      },
      { $set: { [`unreadCounts.${userId}`]: 0 } },
    );

    if (!result) {
      throw AppError.notFound("Chat not found or you are not a participant", "CHAT_NOT_FOUND");
    }

    return { message: "Chat marked as read" };
  }
}

export const messageService = new MessageService();
