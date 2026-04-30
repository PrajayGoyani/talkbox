import { FREE_PLAN_CHAT_LIMIT } from "@config/env";
import { IChat } from "@models/chat.model";
import User from "@models/user.model";
import { ChatRepository, chatRepository } from "@repositories/chat.repository";
import { chatLockdownService } from "@services/chat-lockdown.service";
import { socketService } from "@services/socket.service";
import { AppError } from "@utils/AppError";
import { eventBus, CHAT_EVENTS } from "@utils/event-bus";
import { ObjectId } from "mongodb";

import { IChatActionService } from "./types";

export class ChatActionService implements IChatActionService {
  constructor(private repository: ChatRepository) {}

  async requestChat(senderId: string | ObjectId, targetUsername: string): Promise<IChat> {
    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      throw AppError.notFound("User", "USER_NOT_FOUND");
    }

    const requestingUser = await User.findById(senderId);

    if (requestingUser?.plan === "free") {
      const activeCount = await this.repository.countDocuments({
        participants: senderId,
        status: "accepted",
        isDeleted: false,
      });
      if (activeCount >= FREE_PLAN_CHAT_LIMIT) {
        throw AppError.limitReached("Active chats", "CHAT_LIMIT_REACHED");
      }
    }

    if (targetUser._id.toString() === senderId.toString()) {
      throw AppError.badRequest("You cannot start a chat with yourself", "SELF_CHAT");
    }

    const sortedParticipants = [new ObjectId(targetUser._id), new ObjectId(senderId)].sort((a, b) =>
      a.toString().localeCompare(b.toString()),
    );
    const [userA, userB] = sortedParticipants;

    const existingChat = await this.repository.findOne({ userA, userB, isGroup: false, isDeleted: false });
    if (existingChat) {
      if (existingChat.status === "rejected") {
        existingChat.status = "pending";
        existingChat.createdBy = senderId as ObjectId;
        await existingChat.save();

        eventBus.emit(CHAT_EVENTS.REQUESTED, { chat: existingChat, senderId, targetUserId: targetUser._id });
        return existingChat;
      }
      if (existingChat.status === "pending") {
        throw AppError.badRequest("A chat request is already pending", "CHAT_ALREADY_PENDING");
      }
      throw AppError.badRequest("You already have an active chat with this user", "CHAT_EXISTS");
    }

    const chat = await this.repository.chatModel.create({
      userA,
      userB,
      participants: sortedParticipants,
      isGroup: false,
      createdBy: senderId,
      status: "pending",
      isFreeTierOnly: requestingUser?.plan === "free" && targetUser?.plan === "free",
      lastMessage: {
        sentAt: new Date(),
      },
    });

    eventBus.emit(CHAT_EVENTS.REQUESTED, {
      chat,
      senderId,
      targetUserId: targetUser._id,
      senderUsername: requestingUser?.username,
    });

    return chat;
  }

  async acceptChat(chatId: string, userId: string): Promise<IChat> {
    const chat = await this.repository.findById(chatId);
    if (!chat) throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    if (chat.status !== "pending") throw AppError.badRequest("Chat is not pending", "CHAT_NOT_PENDING");
    if (chat.createdBy.toString() === userId.toString()) {
      throw AppError.forbidden("Only the receiver can accept a chat request");
    }

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not part of this chat");
    }

    chat.status = "accepted";
    await chat.save();

    for (const p of chat.participants) {
      await socketService.invalidatePartnerCache(p.toString());
    }

    const acceptor = await User.findById(userId);
    eventBus.emit(CHAT_EVENTS.ACCEPTED, { chat, userId, acceptorUsername: acceptor?.username });

    return chat;
  }

  async rejectChat(chatId: string | ObjectId, userId: string | ObjectId): Promise<IChat> {
    const chat = await this.repository.findById(chatId);
    if (!chat) throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    if (chat.status !== "pending") throw AppError.badRequest("Chat is not pending", "CHAT_NOT_PENDING");
    if (chat.createdBy.toString() === userId.toString()) {
      throw AppError.forbidden("Only the receiver can reject a chat request");
    }

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not part of this chat");
    }

    chat.status = "rejected";
    await chat.save();

    const rejector = await User.findById(userId);
    eventBus.emit(CHAT_EVENTS.REJECTED, { chat, userId, rejectorUsername: rejector?.username });

    return chat;
  }

  async deleteChat(chatId: string | ObjectId, userId: string | ObjectId): Promise<{ message: string }> {
    const chat = await this.repository.findById(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }

    const isParticipant = chat.participants.some((p: any) => p.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not part of this chat");
    }

    chat.isDeleted = true;
    chat.deletedAt = new Date();
    await chat.save();

    for (const p of chat.participants) {
      await socketService.invalidatePartnerCache(p.toString());
    }

    await chatLockdownService.lockdownChat(chatId);
    eventBus.emit(CHAT_EVENTS.DELETED, { chatId, userId });

    return { message: "Chat successfully deleted" };
  }
}

export const chatActionService = new ChatActionService(chatRepository);
