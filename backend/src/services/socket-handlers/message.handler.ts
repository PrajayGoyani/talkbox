import { RATE_LIMIT_SOCKET_MESSAGE_MAX, RATE_LIMIT_DEFAULT_WINDOW_MS } from "@config/env";
import Chat, { IChat } from "@models/chat.model";
import Message, { IMessage } from "@models/message.model";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { isPastModifyLimit, isScrubbed } from "@utils/date.utils";
import { extractEmojiMetadata } from "@utils/emoji.utils";

import { AuthenticatedSocketUser, MessageDto, TypedIO } from "@/types/socket.types";

export class MessageHandler {
  constructor(private ioProvider: () => TypedIO | null) {}

  async validateModification(
    sender: AuthenticatedSocketUser,
    messageId: string,
  ): Promise<{ message: IMessage; chat: IChat } | null> {
    const message = await Message.findById(messageId).select("chatId senderId createdAt isDeleted contentBody").lean();
    if (!message || message.isDeleted) return null;

    const chat = await Chat.findById(message.chatId).select("participants status lastMessage").lean();
    if (!chat || chat.status !== "accepted") return null;

    if (isScrubbed(sender.plan, message.createdAt)) return null;
    if (message.senderId.toString() !== sender.id) return null;
    if (isPastModifyLimit(message.createdAt)) return null;

    return { message: message as any, chat: chat as any };
  }

  private isLastMessage(chat: IChat, message: IMessage): boolean {
    return Boolean(
      chat.lastMessage && chat.lastMessage.sentAt && chat.lastMessage.sentAt.getTime() === message.createdAt.getTime(),
    );
  }

  async saveAndDeliver(
    sender: AuthenticatedSocketUser,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
    checkCache: (chatId: string) => Set<string> | null | undefined,
    updateCache: (chatId: string, participants: Set<string> | null) => void,
  ): Promise<MessageDto> {
    const senderId = sender.id;
    const { chatId, receiverId, contentBody, idempotencyKey } = payload;
    const io = this.ioProvider();

    // 0, 1. Parallelize Lockdown and Idempotency L1 check
    const [isLocked, isNewToRedis] = await Promise.all([
      chatLockdownService.isChatDeleted(chatId),
      redisService.checkAndSetIdempotency(idempotencyKey, 900), // 15 minutes TTL for Redis L1
    ]);

    if (isLocked) {
      throw AppError.forbidden("Cannot send messages to a deleted chat.");
    }

    // 2. Cache check (keep serial for now as it's local memory)
    const cached = checkCache(chatId);
    if (cached && !cached.has(senderId)) {
      throw AppError.forbidden("You are not a participant in this chat.");
    }

    // 3. Deduplication (L2 check)
    // If not new to Redis, it definitely exists in DB.
    // If new to Redis, it MIGHT still exist in DB (e.g. Redis eviction), so we still check before create
    if (!isNewToRedis) {
      const existingMessage = await Message.findOne({ idempotencyKey }).lean();
      if (existingMessage) {
        return this.toDto(existingMessage);
      }
    }

    // 4. Rate limit (Now that we know it's not a duplicate message)
    const isAllowed = await redisService.incrementAndCheckLimit(
      `rl:socket:message:${senderId}`,
      RATE_LIMIT_SOCKET_MESSAGE_MAX,
      RATE_LIMIT_DEFAULT_WINDOW_MS,
    );

    if (!isAllowed) {
      io?.to(`user:${senderId}`).emit("error", {
        message: "You are sending messages too fast. Please slow down.",
        code: "RATE_LIMIT_EXCEEDED",
      });
      throw AppError.tooMany("Message sending limit reached.", "RATE_LIMIT_EXCEEDED");
    }

    // 5. Save
    let message: IMessage;
    try {
      message = await Message.create({ chatId, senderId, contentBody, idempotencyKey });
    } catch (err: any) {
      if (err.code === 11000) {
        // Mongo duplicate key error - someone beat us to it
        const existing = await Message.findOne({ idempotencyKey }).lean();
        if (existing) return this.toDto(existing);
      }
      throw err;
    }

    // 6. Update Chat
    const chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        status: "accepted",
        isDeleted: false,
        participants: senderId,
      },
      {
        lastMessage: { contentBody, senderId, sentAt: message.createdAt },
        $inc: { [`unreadCounts.${receiverId}`]: 1 },
      },
      { new: true, lean: true },
    );

    if (!chat) {
      await Message.findByIdAndDelete(message._id);
      throw AppError.forbidden("Message delivery failed: Chat is invalid or restricted.");
    }

    if (!cached) {
      updateCache(chatId, new Set(chat.participants.map((p: any) => p.toString())));
    }

    const dto = this.toDto(message.toObject(), contentBody);

    // 7. Deliver to all participants
    for (const p of chat.participants) {
      const pId = p.toString();
      io?.to(`user:${pId}`).emit("receive_message", dto);

      // If it's the receiver, also send an alert
      if (pId === receiverId) {
        try {
          const preview = contentBody.length > 60 ? contentBody.substring(0, 60) + "..." : contentBody;
          io?.to(`user:${pId}`).emit("message_alert", {
            chatId,
            senderId,
            senderName: sender.name || null,
            senderUsername: sender.username,
            senderAvatar: sender.avatarUrl,
            preview,
          });
        } catch (err) {
          console.error("[MessageHandler] Alert failed:", err);
        }
      }
    }

    return dto;
  }

  async handleDelete(sender: AuthenticatedSocketUser, messageId: string) {
    const result = await this.validateModification(sender, messageId);
    if (!result) return;

    const { message, chat } = result;
    const io = this.ioProvider();

    await Message.updateOne(
      { _id: messageId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          contentBody: "This message was deleted",
          attachment: { kind: null, url: null },
          reactions: [],
        },
      },
    );

    const isLast = this.isLastMessage(chat, message);
    const updatePayload = { messageId: messageId.toString(), chatId: message.chatId.toString(), isLastMessage: isLast };

    chat.participants.forEach((p: any) => {
      io?.to(`user:${p.toString()}`).emit("message_deleted", updatePayload);
    });

    if (isLast) {
      await Chat.updateOne({ _id: chat._id }, { $set: { "lastMessage.contentBody": "Message deleted" } });
    }
  }

  async handleEdit(sender: AuthenticatedSocketUser, messageId: string, contentBody: string) {
    const result = await this.validateModification(sender, messageId);
    if (!result) return;

    const { message, chat } = result;
    const io = this.ioProvider();

    const trimmedContent = contentBody.trim();
    await Message.updateOne(
      { _id: messageId },
      {
        $set: {
          contentBody: trimmedContent,
          isEdited: true,
          editedAt: new Date(),
        },
      },
    );
    // Update local object for subsequent logic (isLast)
    message.contentBody = trimmedContent;
    message.isEdited = true;
    message.editedAt = new Date();

    const isLast = this.isLastMessage(chat, message);
    const updatePayload = {
      messageId: messageId.toString(),
      chatId: message.chatId.toString(),
      contentBody: message.contentBody,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
    };

    chat.participants.forEach((p: any) => {
      io?.to(`user:${p.toString()}`).emit("message_updated", updatePayload);
    });

    if (isLast) {
      await Chat.updateOne({ _id: chat._id }, { $set: { "lastMessage.contentBody": message.contentBody } });
    }
  }

  private toDto(messageObj: any, contentOverride?: string): MessageDto {
    const content = contentOverride || messageObj.contentBody;
    return {
      ...messageObj,
      id: messageObj._id.toString(),
      chatId: messageObj.chatId.toString(),
      senderId: messageObj.senderId.toString(),
      emojiMetadata: extractEmojiMetadata(content),
      reactions: messageObj.reactions?.map((r: any) => ({
        emoji: r.emoji,
        slug: r.slug,
        users: r.users.map((u: any) => u.toString()),
      })),
    } as MessageDto;
  }
}
