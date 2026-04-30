import { ChatRepository, chatRepository } from "@repositories/chat.repository";
import { MessageRepository, messageRepository } from "@repositories/message.repository";
import { AppError } from "@utils/AppError";
import { ObjectId } from "mongodb";

import { MessageDto } from "@/types/socket.types";

import { IMessageService } from "./types";

export class MessageService implements IMessageService {
  constructor(
    private chatRepo: ChatRepository,
    private messageRepo: MessageRepository,
  ) {}

  async getChatMessages(
    chatId: string | ObjectId,
    userId: string,
    limit: number = 50,
    cursor: string | null = null,
    plan: "free" | "pro" = "free",
  ): Promise<MessageDto[]> {
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

  async markChatRead(
    chatId: string | ObjectId,
    userId: string | ObjectId,
  ): Promise<{ message: string }> {
    const result = await this.chatRepo.markAsRead(chatId, userId);

    if (!result) {
      throw AppError.notFound("Chat not found or you are not a participant", "CHAT_NOT_FOUND");
    }

    return { message: "Chat marked as read" };
  }
}

export const messageService = new MessageService(chatRepository, messageRepository);
