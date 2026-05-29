import { FREE_PLAN_CHAT_LIMIT } from "@config/env";
import { IChat } from "@models/chat.model";
import { IChatRepository } from "@repositories/interfaces/chat.repository";
import { IUserRepository } from "@repositories/interfaces/user.repository";
import { IRedisSessionService } from "@services/infra/interfaces";
import { AppError } from "@utils/AppError";
import { CHAT_EVENTS, eventBus } from "@utils/event-bus";
import { ObjectId } from "mongodb";

import { IChatLockdownService, IChatActionService } from "./types";

export class ChatActionService implements IChatActionService {
  constructor(
    private repository: IChatRepository,
    private userRepository: IUserRepository,
    private chatLockdownService: IChatLockdownService,
    private redisSessionService: IRedisSessionService,
  ) {}

  async requestChat(senderId: string | ObjectId, targetUsername: string): Promise<IChat> {
    const targetUser = await this.userRepository.findOne({ username: targetUsername });
    if (!targetUser) {
      throw AppError.notFound("User", "USER_NOT_FOUND");
    }

    const requestingUser = await this.userRepository.findById(senderId);
    if (!requestingUser) {
      throw AppError.notFound("User", "USER_NOT_FOUND");
    }

    if (!requestingUser.isEmailVerified && requestingUser.plan === "free") {
      throw AppError.verificationRequired("Please verify your email to start new chats.");
    }

    if (requestingUser.plan === "free") {
      const activeCount = await this.repository.countDocuments({
        participants: senderId,
        status: "accepted",
        isDeleted: false,
      });
      if (activeCount >= FREE_PLAN_CHAT_LIMIT) {
        throw AppError.forbidden(
          "Free plan chat limit reached. Upgrade to Pro to start more chats.",
          "CHAT_LIMIT_REACHED",
        );
      }
    }

    const senderObjectId = new ObjectId(senderId);
    const targetId = targetUser._id as ObjectId;

    if (senderObjectId.equals(targetId)) {
      throw AppError.badRequest("You cannot chat with yourself");
    }

    const existingChat = await this.repository.findOne({
      participants: { $all: [senderObjectId, targetId] },
      isDeleted: false,
    });

    if (existingChat) {
      if (existingChat.status === "accepted") {
        throw AppError.conflict("Chat already exists");
      }
      if (existingChat.status === "pending") {
        throw AppError.conflict("Chat request is already pending");
      }
    }

    const chat = await this.repository.create({
      participants: [senderObjectId, targetId],
      status: "pending",
      createdBy: senderObjectId,
    });

    // Invalidate partner cache for the target user so their socket re-syncs to watch the requester
    await this.redisSessionService.publishCacheInvalidation("partner", targetId.toString());

    // Emit event for side-effects (notifications, etc)
    eventBus.emit(CHAT_EVENTS.REQUESTED, {
      chat,
      senderId: senderObjectId,
      targetUserId: targetId,
      senderUsername: requestingUser?.username || "Someone",
    });

    return chat;
  }

  async acceptChat(chatId: string | ObjectId, userId: string | ObjectId): Promise<IChat> {
    const chat = await this.repository.findById(chatId);
    if (!chat) throw AppError.notFound("Chat");

    if (chat.status !== "pending") {
      throw AppError.badRequest("Chat is already " + chat.status);
    }

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not authorized to accept this chat");
    }

    if (chat.createdBy?.toString() === userId.toString()) {
      throw AppError.forbidden("You cannot accept your own chat request");
    }

    const acceptor = await this.userRepository.findById(userId);
    if (!acceptor) throw AppError.notFound("User");

    if (!acceptor.isEmailVerified && acceptor.plan === "free") {
      throw AppError.verificationRequired("Please verify your email to accept chat requests.");
    }

    const updatedChat = await this.repository.updateById(chatId, {
      status: "accepted",
      acceptedAt: new Date(),
    });

    if (!updatedChat) throw AppError.notFound("Chat");

    // Invalidate partner cache for both participants globally
    await Promise.all(
      updatedChat.participants.map((p: any) =>
        this.redisSessionService.publishCacheInvalidation("partner", p.toString()),
      ),
    );

    // Emit event for real-time updates and notifications
    eventBus.emit(CHAT_EVENTS.ACCEPTED, {
      chat: updatedChat,
      userId,
      acceptorUsername: acceptor?.username,
    });

    return updatedChat;
  }

  async rejectChat(chatId: string | ObjectId, userId: string | ObjectId): Promise<IChat> {
    const chat = await this.repository.findById(chatId);
    if (!chat) throw AppError.notFound("Chat");

    if (chat.status !== "pending") {
      throw AppError.badRequest("Only pending requests can be rejected");
    }

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not authorized to reject this chat");
    }

    const updatedChat = await this.repository.updateById(chatId, {
      status: "rejected",
      isDeleted: true,
      deletedAt: new Date(),
    });

    if (!updatedChat) throw AppError.notFound("Chat");

    const rejector = await this.userRepository.findById(userId);

    // Emit event for side-effects
    eventBus.emit(CHAT_EVENTS.REJECTED, {
      chat: updatedChat,
      userId,
      rejectorUsername: rejector?.username,
    });

    return updatedChat;
  }

  async deleteChat(chatId: string | ObjectId, userId: string | ObjectId): Promise<{ message: string }> {
    const chat = await this.repository.findById(chatId);
    if (!chat) throw AppError.notFound("Chat");

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not authorized to delete this chat");
    }

    await this.repository.updateById(chatId, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    // Invalidate lockdown cache immediately
    await this.chatLockdownService.lockdownChat(chatId.toString());

    // Invalidate partner cache for both participants and chat cache globally
    await Promise.all([
      ...chat.participants.map((p: any) => this.redisSessionService.publishCacheInvalidation("partner", p.toString())),
      this.redisSessionService.publishCacheInvalidation("chat", chatId.toString()),
    ]);

    // Emit event for side-effects
    eventBus.emit(CHAT_EVENTS.DELETED, { chatId, userId });

    return { message: "Chat successfully deleted" };
  }

  async updateRetentionPeriod(
    chatId: string | ObjectId,
    userId: string | ObjectId,
    retentionPeriod: number | null,
  ): Promise<IChat> {
    const chat = await this.repository.findById(chatId);
    if (!chat) throw AppError.notFound("Chat");

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not authorized to update this chat");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound("User");

    // Validate retention period based on Free and Pro tier
    if (user.plan === "free") {
      if (retentionPeriod === null || retentionPeriod === 0 || retentionPeriod > 12) {
        throw AppError.forbidden(
          "Free users can set up to 12 months retention and cannot choose Lifetime.",
          "RETENTION_LIMIT_EXCEEDED",
        );
      }
    }

    const updatedChat = await this.repository.updateById(chatId, {
      retentionPeriod,
    });

    if (!updatedChat) throw AppError.notFound("Chat");

    // Invalidate partner cache and chat cache globally
    await Promise.all([
      ...updatedChat.participants.map((p: any) =>
        this.redisSessionService.publishCacheInvalidation("partner", p.toString()),
      ),
      this.redisSessionService.publishCacheInvalidation("chat", chatId.toString()),
    ]);

    // Emit event for real-time socket delivery
    eventBus.emit(CHAT_EVENTS.RETENTION_UPDATED, {
      chatId: updatedChat._id.toString(),
      retentionPeriod,
      participants: updatedChat.participants.map((p: any) => p.toString()),
    });

    return updatedChat;
  }
}
