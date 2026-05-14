import { IChat } from "@models/chat.model";
import { ObjectId } from "mongodb";
import { ChatDto } from "shared/types/chat.dto";

export interface IChatQueryRepository {
  findPartnerChats(userId: string | ObjectId, excludeDeleted: boolean): Promise<any[]>;
  transformChat(chat: IChat, userId: string | ObjectId): ChatDto;
  searchChats(
    userId: ObjectId,
    query: string,
    limit: number,
    cursorObj: { t: Date; id: string } | null,
  ): Promise<any[]>;
  findAcceptedChatsByUser(userId: string | ObjectId, query: Record<string, any>, limit: number): Promise<any[]>;
  findPendingRequestsByUser(userId: string | ObjectId, query: Record<string, any>, limit: number): Promise<any[]>;
  findByIdWithParticipants(chatId: string | ObjectId): Promise<IChat | null>;
}
