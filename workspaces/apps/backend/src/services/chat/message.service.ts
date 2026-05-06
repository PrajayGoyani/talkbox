import { RATE_LIMIT_DEFAULT_WINDOW_MS, RATE_LIMIT_SOCKET_MESSAGE_MAX } from "@config/env";
import { CHAT_MESSAGES } from "@constants/messages";
import { IChat } from "@models/chat.model";
import { IMessage } from "@models/message.model";
import { ChatRepository, chatRepository } from "@repositories/chat.repository";
import { MessageRepository, messageRepository } from "@repositories/message.repository";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { isPastModifyLimit, isScrubbed } from "@utils/date.utils";
import { CHAT_EVENTS, eventBus } from "@utils/event-bus";
import { LRUCache } from "lru-cache";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { MessageDto } from "shared/types/chat.dto";

import { IMessageService } from "./types";

const PARTICIPANT_CACHE_TTL_MS = 10 * 60 * 1000;
const PARTICIPANT_CACHE_MAX = 10000;

export class MessageService implements IMessageService {
  private participantCache: LRUCache<string, Set<string>>;

  constructor(
    private chatRepo: ChatRepository,
    private messageRepo: MessageRepository,
  ) {
    this.participantCache = new LRUCache({
      max: PARTICIPANT_CACHE_MAX,
      ttl: PARTICIPANT_CACHE_TTL_MS,
    });
  }

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

    const transformed = messages.map((m) => this.messageRepo.transformMessage(m, plan));

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
    sender: { id: string; plan: "free" | "pro"; name?: string | null; username: string; avatarUrl?: string },
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
      const activeChatId = await redisService.getActiveChat(receiverId);
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
      this.participantCache.set(chatId, participants);
    }

    const dto = this.messageRepo.transformMessage(message, sender.plan);

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
    const [isLocked, isNewToRedis, rlStatus] = await Promise.all([
      chatLockdownService.isChatDeleted(chatId),
      redisService.checkAndSetIdempotency(idempotencyKey, 900),
      redisService.incrementAndCheckLimit(
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

    return isNewToRedis;
  }

  private async verifyParticipation(chatId: string, senderId: string): Promise<Set<string> | undefined> {
    const cachedParticipants = this.participantCache.get(chatId);
    if (cachedParticipants && !cachedParticipants.has(senderId)) {
      throw AppError.forbidden(CHAT_MESSAGES.NOT_PARTICIPANT);
    }
    return cachedParticipants;
  }

  private async handleDeduplication(idempotencyKey: string, plan: "free" | "pro"): Promise<MessageDto | null> {
    const existingMessage = await this.messageRepo.findOne({ idempotencyKey });
    if (existingMessage) {
      return this.messageRepo.transformMessage(existingMessage, plan);
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
        lastMessage: { contentBody, senderId, sentAt: message.createdAt },
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
      // Handle race condition where idempotency check passed but DB write collided
      if (err.code === 11000) {
        const existing = await this.messageRepo.findOne({ idempotencyKey });
        if (existing) {
          // This should be handled by the caller or we could throw a specific error
          // For now, we'll re-throw or handle it if we can access the plan
          throw err; // Caller should handle transformation if needed
        }
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async deleteMessage(sender: { id: string; plan: "free" | "pro" }, messageId: string) {
    const { message, chat } = await this.validateModification(sender.id, sender.plan, messageId);

    await this.messageRepo.updateOne(
      { _id: messageId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          contentBody: CHAT_MESSAGES.MESSAGE_DELETED,
          attachment: { kind: null, url: null },
          reactions: [],
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

  async editMessage(sender: { id: string; plan: "free" | "pro" }, messageId: string, contentBody: string) {
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
    return Boolean(
      chat.lastMessage && chat.lastMessage.sentAt && chat.lastMessage.sentAt.getTime() === message.createdAt.getTime(),
    );
  }

  public invalidateCache(chatId: string) {
    this.participantCache.delete(chatId);
  }

  public async ensureParticipant(chatId: string, userId: string): Promise<Set<string>> {
    const cached = this.participantCache.get(chatId);
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
    if (!participants.has(userId)) {
      this.participantCache.set(chatId, participants); // Negative cache? No, only positive for now.
      throw AppError.forbidden(CHAT_MESSAGES.NOT_PARTICIPANT);
    }

    this.participantCache.set(chatId, participants);
    return participants;
  }
}

export const messageService = new MessageService(chatRepository, messageRepository);
