import Chat, { IChat, IChatModel } from "@models/chat.model";
import { ObjectId } from "mongodb";

import { IChatRepository } from "./interfaces/chat.repository";

export class ChatRepository implements IChatRepository {
  constructor(public chatModel: IChatModel) {}

  public async findById(id: string | ObjectId) {
    return this.chatModel.findById(id);
  }

  public async findByIdWithSelect(id: string | ObjectId, select: string, lean = true) {
    const query = this.chatModel.findById(id).select(select);
    return lean ? query.lean() : query;
  }

  public async findOne(query: Record<string, any>) {
    return this.chatModel.findOne(query);
  }

  public async countDocuments(query: Record<string, any>) {
    return this.chatModel.countDocuments(query);
  }

  public decodeCursor(cursor: string) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
      if (!ObjectId.isValid(decoded.id)) return null;
      return { t: new Date(decoded.t), id: decoded.id };
    } catch {
      return null;
    }
  }

  public encodeCursor(timestamp: Date, id: string | ObjectId) {
    return Buffer.from(JSON.stringify({ t: timestamp.getTime(), id: id.toString() })).toString("base64");
  }

  public async markAsRead(chatId: string | ObjectId, userId: string | ObjectId) {
    return this.chatModel.findOneAndUpdate(
      {
        _id: chatId,
        participants: userId,
      },
      { $set: { [`unreadCounts.${userId.toString()}`]: 0 } },
      { returnDocument: "after" },
    );
  }

  public async findOneAndUpdate(query: Record<string, any>, update: any) {
    return this.chatModel.findOneAndUpdate(query, update, { returnDocument: "after" });
  }

  public async create(data: Partial<IChat>) {
    return this.chatModel.create(data);
  }

  public async updateById(id: string | ObjectId, update: any, options: any = {}): Promise<IChat | null> {
    return this.chatModel.findByIdAndUpdate(id, update, {
      ...options,
      returnDocument: "after",
    }) as Promise<IChat | null>;
  }
}
