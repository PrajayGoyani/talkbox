import { IMessage } from "@models/message.model";
import { ObjectId } from "mongodb";
import { MessageDto } from "shared/types/chat.dto";

export interface IMessageRepository {
  findByChatId(chatId: string | ObjectId, limit: number, cursor?: string | null): Promise<IMessage[]>;
  findById(id: string | ObjectId): Promise<IMessage | null>;
  findOne(query: Record<string, any>): Promise<IMessage | null>;
  create(data: Partial<IMessage>, options?: any): Promise<IMessage>;
  updateOne(query: Record<string, any>, update: any): Promise<any>;
}
