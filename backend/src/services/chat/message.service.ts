import { chatRepository } from "@repositories/chat.repository";
import { messageRepository } from "@repositories/message.repository";
import { AppError } from "@utils/AppError";
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
    const chat = await chatRepository.findById(chatId);
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

    const messages = await messageRepository.findByChatId(chatId, limit, cursor);

    const transformed = messages.map((m) => messageRepository.transformMessage(m, plan));

    return transformed.reverse();
  }

  async markChatRead(
    chatId: string | ObjectId,
    userId: string | ObjectId,
  ): Promise<{ message: string }> {
    const result = await chatRepository.markAsRead(chatId, userId);

    if (!result) {
      throw AppError.notFound("Chat not found or you are not a participant", "CHAT_NOT_FOUND");
    }

    return { message: "Chat marked as read" };
  }
}

export const messageService = new MessageService();
