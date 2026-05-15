import { RATE_LIMIT_DEFAULT_WINDOW_MS, RATE_LIMIT_SOCKET_MESSAGE_MAX } from "@config/env";
import { CHAT_MESSAGES } from "@constants/messages";
import { IChat } from "@models/chat.model";
import { IMessage } from "@models/message.model";
import { IChatRepository } from "@repositories/interfaces/chat.repository";
import { IMessageRepository } from "@repositories/interfaces/message.repository";
import { IRedisPresenceService, IRedisGuardService } from "@services/infra/interfaces";
import { AppError } from "@utils/AppError";
import { isPastModifyLimit, isScrubbed } from "@utils/date.utils";
import { CHAT_EVENTS, eventBus } from "@utils/event-bus";
import { toMessageDto } from "@utils/mappers";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { MessageDto } from "shared/types/chat.dto";

import { AuthenticatedSocketUser } from "@/types/socket.types";

import { chatCacheService } from "./chat-cache.service";
import { IChatLockdownService, IMessageService } from "./types";

export type MessageSender = Omit<AuthenticatedSocketUser, "bio">;

export class MessageService implements IMessageService {
  constructor(
    private chatRepo: IChatRepository,
    private messageRepo: IMessageRepository,
    private chatLockdownService: IChatLockdownService,
    private redisPresenceService: IRedisPresenceService,
    private redisGuardService: IRedisGuardService,
  ) {}

  async getChatMessages(
    chatId: string | ObjectId,
    userId: string,
    limit: number = 50,
    cursor: string | null = null,
    plan: "free" | "pro" = "free",
    markAsRead: boolean = false,
  ): Promise<MessageDto[]> {
    if (markAsRead) {
      await this.markChatRead(chatId, userId);
    }
    const chat = await this.chatRepo.findById(chatId);
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

    const messages = await this.messageRepo.findByChatId(chatId, limit, cursor);

    const transformed = messages.map((m) => this.transformAndScrubMessage(m, plan));

    return transformed.reverse();
  }

  async markChatRead(chatId: string | ObjectId, userId: string | ObjectId): Promise<{ message: string }> {
    const result = await this.chatRepo.markAsRead(chatId, userId);

    if (!result) {
      throw AppError.notFound("Chat not found or you are not a participant", "CHAT_NOT_FOUND");
    }

    eventBus.emit(CHAT_EVENTS.MESSAGE_READ, { chatId, userId });

    return { message: "Chat marked as read" };
  }

  // ─── Delivery & Modification ───────────────────────────────────────

  async validateModification(
    senderId: string,
    plan: "free" | "pro",
    messageId: string,
  ): Promise<{ message: IMessage; chat: IChat }> {
    const message = await this.messageRepo.findOne({ _id: messageId });
    if (!message || message.isDeleted) {
      throw AppError.notFound("Message not found or already deleted");
    }

    const chat = await this.chatRepo.findById(message.chatId);
    if (!chat || chat.status !== "accepted") {
      throw AppError.forbidden("Chat is invalid or restricted.");
    }

    if (isScrubbed(plan, message.createdAt)) {
      throw AppError.forbidden("Message is too old to modify on your current plan.");
    }
    if (message.senderId.toString() !== senderId) {
      throw AppError.forbidden("You can only modify your own messages.");
    }
    if (isPastModifyLimit(message.createdAt)) {
      throw AppError.forbidden("Modification period has expired.");
    }

    return { message, chat };
  }

  async saveAndDeliver(
    sender: MessageSender,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
  ): Promise<MessageDto> {
    const { chatId, receiverId, contentBody, idempotencyKey } = payload;

    // 1. Pre-persistence Checks (Lockdown, Rate Limit, Idempotency L1)
    const isNewToRedis = await this.applySecurityGuards(sender.id, chatId, idempotencyKey);

    // 2. Participant Verification (Cache-first)
    const cachedParticipants = await this.verifyParticipation(chatId, sender.id);

    // 3. Deduplication (L2 check)
    if (!isNewToRedis) {
      const existing = await this.handleDeduplication(idempotencyKey, sender.plan);
      if (existing) return existing;
    }

    // 4. Atomic Persistence
    let persistenceResult: { message: IMessage; chat: IChat };
    try {
      const activeChatId = await this.redisPresenceService.getActiveChat(receiverId);
      const skipUnreadIncrement = activeChatId === chatId;

      persistenceResult = await this.persistMessageAndNotifyChat(
        chatId,
        sender.id,
        receiverId,
        contentBody,
        idempotencyKey,
        skipUnreadIncrement,
      );
    } catch (err: any) {
      if (err.code === 11000) {
        const existing = await this.handleDeduplication(idempotencyKey, sender.plan);
        if (existing) return existing;
      }
      throw err;
    }
    const { message, chat } = persistenceResult;

    // 5. Post-persistence (Cache Update & Transformation)
    if (!cachedParticipants) {
      const participants = new Set(chat.participants.map((p: any) => p.toString()));
      chatCacheService.setParticipants(chatId, participants);
    }

    const dto = this.transformAndScrubMessage(message, sender.plan);

    // 6. Side Effects (Events)
    eventBus.emit(CHAT_EVENTS.MESSAGE_SENT, {
      message: dto,
      chat,
      sender,
      receiverId,
    });

    return dto;
  }

  private async applySecurityGuards(senderId: string, chatId: string, idempotencyKey: string): Promise<boolean> {
    // 1. Check Idempotency FIRST (L1 check)
    // If Redis already has this key, it's a retry; skip further security costs.
    const isNewToRedis = await this.redisGuardService.checkAndSetIdempotency(idempotencyKey, 900);
    if (!isNewToRedis) return false;

    // 2. Heavy Checks (Lockdown & Rate Limit) only for NEW messages
    const [isLocked, rlStatus] = await Promise.all([
      this.chatLockdownService.isChatDeleted(chatId),
      this.redisGuardService.incrementAndCheckLimit(
        `rl:socket:message:${senderId}`,
        RATE_LIMIT_SOCKET_MESSAGE_MAX,
        RATE_LIMIT_DEFAULT_WINDOW_MS,
      ),
    ]);

    if (isLocked) {
      throw AppError.forbidden(CHAT_MESSAGES.CHAT_DELETED_ERROR);
    }

    if (!rlStatus.allowed) {
      throw AppError.tooMany(CHAT_MESSAGES.RATE_LIMIT_EXCEEDED, "RATE_LIMIT_EXCEEDED");
    }

    return true;
  }

  private async verifyParticipation(chatId: string, senderId: string): Promise<Set<string> | undefined> {
    const cachedParticipants = chatCacheService.getParticipants(chatId);
    if (cachedParticipants) {
      if (!cachedParticipants.has(senderId)) {
        throw AppError.forbidden(CHAT_MESSAGES.NOT_PARTICIPANT);
      }
      return cachedParticipants;
    }

    // fallback to DB if cache miss to guarantee validation
    return await this.ensureParticipant(chatId, senderId);
  }

  private async handleDeduplication(idempotencyKey: string, plan: "free" | "pro"): Promise<MessageDto | null> {
    const existingMessage = await this.messageRepo.findOne({ idempotencyKey });
    if (existingMessage) {
      return this.transformAndScrubMessage(existingMessage, plan);
    }
    return null;
  }

  private async persistMessageAndNotifyChat(
    chatId: string,
    senderId: string,
    receiverId: string,
    contentBody: string,
    idempotencyKey: string,
    skipUnreadIncrement: boolean = false,
  ): Promise<{ message: IMessage; chat: IChat }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const message = await this.messageRepo.create(
        {
          chatId: new ObjectId(chatId),
          senderId: new ObjectId(senderId),
          contentBody,
          idempotencyKey,
        },
        { session },
      );

      const updateData: any = {
        lastMessage: {
          messageId: message._id,
          contentBody,
          senderId,
          sentAt: message.createdAt,
        },
      };

      if (!skipUnreadIncrement) {
        updateData.$inc = { [`unreadCounts.${receiverId}`]: 1 };
      }

      const chat = await this.chatRepo.updateById(chatId, updateData, { session });

      if (!chat) {
        throw AppError.forbidden(CHAT_MESSAGES.DELIVERY_FAILED);
      }

      await session.commitTransaction();
      return { message, chat };
    } catch (err: any) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async deleteMessage(sender: MessageSender, messageId: string) {
    const { message, chat } = await this.validateModification(sender.id, sender.plan, messageId);

    await this.messageRepo.updateOne(
      { _id: messageId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          // Data preserved for auditing/recovery.
          // Masking is handled by transformAndScrubMessage during DTO creation.
        },
      },
    );

    const isLast = this.isLastMessage(chat, message);
    if (isLast) {
      await this.chatRepo.updateById(chat._id, {
        $set: { "lastMessage.contentBody": CHAT_MESSAGES.CHAT_DELETED_NOTICE },
      });
    }

    eventBus.emit(CHAT_EVENTS.MESSAGE_DELETED, {
      messageId,
      chatId: message.chatId.toString(),
      participants: chat.participants.map((p: any) => p.toString()),
      isLastMessage: isLast,
    });
  }

  async editMessage(sender: MessageSender, messageId: string, contentBody: string) {
    const { message, chat } = await this.validateModification(sender.id, sender.plan, messageId);

    const trimmedContent = contentBody.trim();
    const updates = {
      contentBody: trimmedContent,
      isEdited: true,
      editedAt: new Date(),
    };

    await this.messageRepo.updateOne({ _id: messageId }, { $set: updates });

    const isLast = this.isLastMessage(chat, message);
    if (isLast) {
      await this.chatRepo.updateById(chat._id, {
        $set: { "lastMessage.contentBody": updates.contentBody },
      });
    }

    eventBus.emit(CHAT_EVENTS.MESSAGE_UPDATED, {
      messageId,
      chatId: message.chatId.toString(),
      contentBody: updates.contentBody,
      isEdited: updates.isEdited,
      editedAt: updates.editedAt,
      participants: chat.participants.map((p: any) => p.toString()),
    });
  }

  private isLastMessage(chat: IChat, message: IMessage): boolean {
    if (!chat.lastMessage) return false;

    // Primary: Message ID comparison (Robust against high-concurrency collisions)
    if (chat.lastMessage.messageId) {
      return chat.lastMessage.messageId.toString() === message._id.toString();
    }

    // Fallback: Timestamp equality (for legacy chats without messageId)
    return Boolean(
      chat.lastMessage.sentAt &&
      chat.lastMessage.sentAt.getTime() === message.createdAt.getTime() &&
      chat.lastMessage.senderId?.toString() === message.senderId.toString(),
    );
  }

  public invalidateCache(chatId: string) {
    chatCacheService.invalidateParticipants(chatId);
  }

  public async ensureParticipant(chatId: string, userId: string): Promise<Set<string>> {
    const cached = chatCacheService.getParticipants(chatId);
    if (cached) {
      if (!cached.has(userId)) {
        throw AppError.forbidden(CHAT_MESSAGES.NOT_PARTICIPANT);
      }
      return cached;
    }

    const chat = await this.chatRepo.findById(chatId);
    if (!chat || chat.status !== "accepted") {
      throw AppError.forbidden(CHAT_MESSAGES.DELIVERY_FAILED);
    }

    const participants = new Set(chat.participants.map((p: any) => p.toString()));
    chatCacheService.setParticipants(chatId, participants);

    if (!participants.has(userId)) {
      throw AppError.forbidden(CHAT_MESSAGES.NOT_PARTICIPANT);
    }

    return participants;
  }

  /**
   * Transforms a message model to a DTO and applies plan-based scrubbing logic.
   * This logic was moved from the Repository layer to the Service layer to fix architectural leakage.
   */
  private transformAndScrubMessage(
    m: IMessage,
    plan: "free" | "pro" = "free",
    sender?: { name?: string | null; username: string; avatarUrl?: string | null },
  ): MessageDto {
    return toMessageDto(m, plan, sender);
  }
}
