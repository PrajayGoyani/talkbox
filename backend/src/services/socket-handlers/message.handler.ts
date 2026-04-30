import { RATE_LIMIT_DEFAULT_WINDOW_MS, RATE_LIMIT_SOCKET_MESSAGE_MAX } from "@config/env";
import { IChat } from "@models/chat.model";
import { IMessage } from "@models/message.model";
import { chatRepository } from "@repositories/chat.repository";
import { messageRepository } from "@repositories/message.repository";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { isPastModifyLimit, isScrubbed } from "@utils/date.utils";
import { ObjectId } from "mongodb";

import { MessageDto } from "@root/shared/types/chat.dto";
import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class MessageHandler {
  constructor(private ioProvider: () => TypedIO | null) {}

  async validateModification(
    sender: AuthenticatedSocketUser,
    messageId: string,
  ): Promise<{ message: IMessage; chat: IChat } | null> {
    const message = await messageRepository.findOne({ _id: messageId });
    if (!message || message.isDeleted) return null;

    const chat = await chatRepository.findById(message.chatId);
    if (!chat || chat.status !== "accepted") return null;

    if (isScrubbed(sender.plan, message.createdAt)) return null;
    if (message.senderId.toString() !== sender.id) return null;
    if (isPastModifyLimit(message.createdAt)) return null;

    return { message, chat };
  }

  private isLastMessage(chat: IChat, message: IMessage): boolean {
    return Boolean(
      chat.lastMessage &&
      chat.lastMessage.sentAt &&
      chat.lastMessage.sentAt.getTime() === message.createdAt.getTime(),
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
    if (!isNewToRedis) {
      const existingMessage = await messageRepository.findOne({ idempotencyKey });
      if (existingMessage) {
        return messageRepository.transformMessage(existingMessage, sender.plan);
      }
    }

    // 4. Rate limit (Now that we know it's not a duplicate message)
    const rlStatus = await redisService.incrementAndCheckLimit(
      `rl:socket:message:${senderId}`,
      RATE_LIMIT_SOCKET_MESSAGE_MAX,
      RATE_LIMIT_DEFAULT_WINDOW_MS,
    );

    if (!rlStatus.allowed) {
      io?.to(`user:${senderId}`).emit("error", {
        message: "You are sending messages too fast. Please slow down.",
        code: "RATE_LIMIT_EXCEEDED",
      });
      throw AppError.tooMany("Message sending limit reached.", "RATE_LIMIT_EXCEEDED");
    }

    // 5. Save
    let message: IMessage;
    try {
      message = await messageRepository.create({
        chatId: new ObjectId(chatId),
        senderId: new ObjectId(senderId),
        contentBody,
        idempotencyKey,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Mongo duplicate key error - someone beat us to it
        const existing = await messageRepository.findOne({ idempotencyKey });
        if (existing) return messageRepository.transformMessage(existing, sender.plan);
      }
      throw err;
    }

    // 6. Update Chat
    const chat = await chatRepository.updateById(chatId, {
      lastMessage: { contentBody, senderId, sentAt: message.createdAt },
      $inc: { [`unreadCounts.${receiverId}`]: 1 },
    });

    if (!chat) {
      // Manual rollback if chat update fails
      await messageRepository.updateOne({ _id: message._id }, { $set: { isDeleted: true } });
      throw AppError.forbidden("Message delivery failed: Chat is invalid or restricted.");
    }

    if (!cached) {
      updateCache(chatId, new Set(chat.participants.map((p: any) => p.toString())));
    }

    const dto = messageRepository.transformMessage(message, sender.plan);

    // 7. Deliver to all participants
    for (const p of chat.participants) {
      const pId = p.toString();
      io?.to(`user:${pId}`).emit("receive_message", dto);

      // If it's the receiver, also send an alert
      if (pId === receiverId) {
        try {
          const preview =
            contentBody.length > 60 ? contentBody.substring(0, 60) + "..." : contentBody;
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

    await messageRepository.updateOne(
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
    const updatePayload = {
      messageId: messageId.toString(),
      chatId: message.chatId.toString(),
      isLastMessage: isLast,
    };

    chat.participants.forEach((p: any) => {
      io?.to(`user:${p.toString()}`).emit("message_deleted", updatePayload);
    });

    if (isLast) {
      await chatRepository.updateById(chat._id, {
        $set: { "lastMessage.contentBody": "Message deleted" },
      });
    }
  }

  async handleEdit(sender: AuthenticatedSocketUser, messageId: string, contentBody: string) {
    const result = await this.validateModification(sender, messageId);
    if (!result) return;

    const { message, chat } = result;
    const io = this.ioProvider();

    const trimmedContent = contentBody.trim();
    const updates = {
      contentBody: trimmedContent,
      isEdited: true,
      editedAt: new Date(),
    };

    await messageRepository.updateOne({ _id: messageId }, { $set: updates });

    const isLast = this.isLastMessage(chat, message);
    const updatePayload = {
      messageId: messageId.toString(),
      chatId: message.chatId.toString(),
      contentBody: updates.contentBody,
      isEdited: updates.isEdited,
      editedAt: updates.editedAt,
    };

    chat.participants.forEach((p: any) => {
      io?.to(`user:${p.toString()}`).emit("message_updated", updatePayload);
    });

    if (isLast) {
      await chatRepository.updateById(chat._id, {
        $set: { "lastMessage.contentBody": updates.contentBody },
      });
    }
  }
}
