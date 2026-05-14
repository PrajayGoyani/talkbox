import { IChat } from "@models/chat.model";
import { ObjectId } from "mongodb";

export interface IChatRepository {
  findById(id: string | ObjectId): Promise<IChat | null>;
  findByIdWithSelect(id: string | ObjectId, select: string, lean?: boolean): Promise<any>;
  findOne(query: Record<string, any>): Promise<IChat | null>;
  countDocuments(query: Record<string, any>): Promise<number>;
  decodeCursor(cursor: string): { t: Date; id: string } | null;
  encodeCursor(timestamp: Date, id: string | ObjectId): string;
  markAsRead(chatId: string | ObjectId, userId: string | ObjectId): Promise<IChat | null>;
  findOneAndUpdate(query: Record<string, any>, update: any): Promise<IChat | null>;
  create(data: Partial<IChat>): Promise<IChat>;
  updateById(id: string | ObjectId, update: any, options?: any): Promise<IChat | null>;
}
