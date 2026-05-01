import { RATE_LIMIT_DEFAULT_WINDOW_MS, RATE_LIMIT_SOCKET_MESSAGE_MAX } from "@config/env";
import { IChat } from "@models/chat.model";
import { IMessage } from "@models/message.model";
import { ChatRepository } from "@repositories/chat.repository";
import { MessageRepository } from "@repositories/message.repository";
import { MessageDto } from "@root/shared/types/chat.dto";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { eventBus, CHAT_EVENTS } from "@utils/event-bus";
import { isPastModifyLimit, isScrubbed } from "@utils/date.utils";
import { ObjectId } from "mongodb";

import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class MessageHandler {
  constructor(
    private ioProvider: () => TypedIO | null,
    private chatRepo: ChatRepository,
    private messageRepo: MessageRepository,
  ) {}

  async validateModification(
    sender: AuthenticatedSocketUser,
    messageId: string,
  ): Promise<{ message: IMessage; chat: IChat } | null> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.isDeleted) return null;

    const chat = await this.chatRepo.findById(message.chatId);
    if (!chat || chat.status !== "accepted") return null;

    if (isScrubbed(sender.plan, message.createdAt)) return null;
    if (message.senderId.toString() !== sender.id) return null;
    if (isPastModifyLimit(message.createdAt)) return null;

    return { message, chat };
  }

  private isLastMessage(chat: IChat, message: IMessage): boolean {
    return Boolean(
      chat.lastMessage && chat.lastMessage.sentAt && chat.lastMessage.sentAt.getTime() === message.createdAt.getTime(),
    );
  }

  async saveAndDeliver(
    sender: AuthenticatedSocketUser,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
    checkCache: (chatId: string) => Set<string> | undefined,
    updateCache: (chatId: string, participants: Set<string>) => void,
  ): Promise<MessageDto> {
    const senderId = sender.id;
    const { chatId, contentBody, idempotencyKey } = payload;
    const io = this.ioProvider();

    // 0, 1. Parallelize Lockdown and Idempotency L1 check
    const [isLocked, isNewToRedis] = await Promise.all([
      chatLockdownService.isChatDeleted(chatId),
      redisService.checkAndSetIdempotency(idempotencyKey, 900), // 15 minutes TTL for Redis L1
    ]);

    if (isLocked) {
      throw AppError.forbidden("Cannot send messages to a deleted chat.");
    }

    // 2. Cache check & Participant Security
    const cached = checkCache(chatId);
    let participantIds: string[];

    if (cached) {
      if (!cached.has(senderId)) {
        throw AppError.forbidden("You are not a participant in this chat.");
      }
      participantIds = Array.from(cached);
    } else {
      const chat = await this.chatRepo.findByIdWithSelect(chatId, "participants status");
      if (!chat || chat.status !== "accepted") {
        throw AppError.forbidden("Chat not found or not accepted.");
      }
      participantIds = chat.participants.map((p: any) => p.toString());
      if (!participantIds.includes(senderId)) {
        throw AppError.forbidden("You are not a participant in this chat.");
      }
      updateCache(chatId, new Set(participantIds));
    }

    // 3. Deduplication (L2 check)
    if (!isNewToRedis) {
      const existingMessage = await this.messageRepo.findOne({ idempotencyKey });
      if (existingMessage) {
        return this.messageRepo.transformMessage(existingMessage, sender.plan);
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

    // 4. Update Chat (Atomic sequence increment)
    try {
      // Increment unread counts for all participants except the sender
      const recipients = participantIds.filter((id) => id !== senderId);
      await this.chatRepo.updateLastMessage(chatId, senderId, contentBody, recipients);
    } catch (err) {
      console.error("[MessageHandler] Error updating chat metadata:", err);
      // Non-blocking for message delivery, but should be logged
    }

    // 5. Save
    let message: IMessage;
    try {
      message = await this.messageRepo.create({
        chatId: new ObjectId(chatId),
        senderId: new ObjectId(senderId),
        contentBody,
        idempotencyKey,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Idempotency Race condition (unlikely with L1 Redis, but good for safety)
        const raceMessage = await this.messageRepo.findOne({ idempotencyKey });
        if (raceMessage) return this.messageRepo.transformMessage(raceMessage, sender.plan);
      }
      throw err;
    }

    // 6. Deliver via Event Bus (Decoupled Side-Effect)
    const dto = this.messageRepo.transformMessage(message, sender.plan, sender);
    eventBus.emit(CHAT_EVENTS.MESSAGE_SENT, {
      message,
      dto,
      participants: participantIds,
      senderId,
    });

    return dto;
  }

  async handleDelete(sender: AuthenticatedSocketUser, messageId: string) {
    const valid = await this.validateModification(sender, messageId);
    if (!valid) return;

    const { message, chat } = valid;
    message.isDeleted = true;
    await message.save();

    const payload = { messageId, chatId: chat._id.toString(), isLastMessage: this.isLastMessage(chat, message) };
    eventBus.emit(CHAT_EVENTS.MESSAGE_DELETED, {
      ...payload,
      participants: chat.participants,
    });
  }

  async handleEdit(sender: AuthenticatedSocketUser, messageId: string, contentBody: string) {
    const valid = await this.validateModification(sender, messageId);
    if (!valid) return;

    const { message, chat } = valid;
    message.contentBody = contentBody;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const payload = {
      messageId,
      chatId: chat._id.toString(),
      contentBody,
      isEdited: true,
      editedAt: message.editedAt,
    };

    eventBus.emit(CHAT_EVENTS.MESSAGE_UPDATED, {
      ...payload,
      participants: chat.participants,
    });
  }
}
