import { IChatQueryRepository } from "@repositories/interfaces/chat-query.repository";
import { IChatRepository } from "@repositories/interfaces/chat.repository";
import { AppError } from "@utils/AppError";
import { ObjectId } from "mongodb";
import { ChatDto, ChatListingResponseDto } from "shared/types/chat.dto";

import { IChatListingService } from "./types";

export class ChatListingService implements IChatListingService {
  constructor(
    private repository: IChatRepository,
    private queryRepository: IChatQueryRepository,
  ) {}

  async getChatListing(
    userId: string | ObjectId,
    limit = 20,
    cursor: string | null = null,
  ): Promise<ChatListingResponseDto> {
    const query: any = {
      participants: userId,
      isDeleted: false,
      status: "accepted",
    };

    if (cursor) {
      const decoded = this.repository.decodeCursor(cursor);
      if (decoded) {
        query.$and = [
          {
            $or: [
              { "lastMessage.sentAt": { $lt: decoded.t } },
              {
                $and: [{ "lastMessage.sentAt": decoded.t }, { _id: { $lt: new ObjectId(decoded.id) } }],
              },
            ],
          },
        ];
      }
    }

    const chats = await this.queryRepository.findAcceptedChatsByUser(userId, query, limit + 1);

    const hasMore = chats.length > limit;
    const results = hasMore ? chats.slice(0, limit) : chats;

    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const last = results[results.length - 1];
      nextCursor = this.repository.encodeCursor(last.lastMessage?.sentAt || last.createdAt, last._id.toString());
    }

    return {
      data: results.map((chat: any) => this.queryRepository.transformChat(chat, userId)),
      nextCursor,
      hasMore,
    };
  }

  async getChatRequests(
    userId: string | ObjectId,
    limit = 20,
    cursor: string | null = null,
  ): Promise<ChatListingResponseDto> {
    const query: any = {
      participants: userId,
      isDeleted: false,
      status: "pending",
    };

    if (cursor) {
      const decoded = this.repository.decodeCursor(cursor);
      if (decoded) {
        query.$and = [
          {
            $or: [
              { createdAt: { $lt: decoded.t } },
              {
                $and: [{ createdAt: decoded.t }, { _id: { $lt: new ObjectId(decoded.id) } }],
              },
            ],
          },
        ];
      }
    }

    const chats = await this.queryRepository.findPendingRequestsByUser(userId, query, limit + 1);

    const hasMore = chats.length > limit;
    const results = hasMore ? chats.slice(0, limit) : chats;

    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const last = results[results.length - 1];
      nextCursor = this.repository.encodeCursor(last.createdAt, last._id.toString());
    }

    return {
      data: results.map((chat: any) => this.queryRepository.transformChat(chat, userId)),
      nextCursor,
      hasMore,
    };
  }

  async searchChats(
    userId: string | ObjectId,
    query: string,
    limit = 20,
    cursor: string | null = null,
  ): Promise<ChatListingResponseDto> {
    const uid = new ObjectId(userId);
    const cursorObj = cursor ? this.repository.decodeCursor(cursor) : null;

    const chats = await this.queryRepository.searchChats(uid, query, limit, cursorObj);

    let hasMore = false;
    let nextCursor: string | null = null;

    if (chats.length > limit) {
      hasMore = true;
      const lastItem = chats[limit - 1];
      nextCursor = this.repository.encodeCursor(new Date(lastItem.sortTime), lastItem.id);
      chats.pop();
    }

    return {
      data: chats.map((chat: any) => ({
        ...chat,
        lastMessage: chat.lastMessage?.contentBody
          ? {
              contentBody: chat.lastMessage.contentBody,
              senderId: chat.lastMessage.senderId?.toString() || null,
              sentAt: chat.lastMessage.sentAt,
            }
          : null,
      })) as ChatDto[],
      nextCursor,
      hasMore,
    };
  }

  async getChat(userId: string | ObjectId, chatId: string | ObjectId): Promise<ChatDto> {
    const chat = await this.queryRepository.findByIdWithParticipants(chatId);
    if (!chat) {
      throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }

    const isParticipant = chat.participants.some((p: any) => p._id.toString() === userId.toString());
    if (!isParticipant) {
      throw AppError.forbidden("You are not part of this chat", "FORBIDDEN");
    }

    return this.queryRepository.transformChat(chat, userId);
  }
}
