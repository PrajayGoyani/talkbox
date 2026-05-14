import Message, { IMessage, IMessageModel } from "@models/message.model";
import { ObjectId } from "mongodb";
import { MessageDto } from "shared/types/chat.dto";

import { IMessageRepository } from "./interfaces/message.repository";

export class MessageRepository implements IMessageRepository {
  constructor(public messageModel: IMessageModel) {}

  public async findByChatId(chatId: string | ObjectId, limit: number, cursor?: string | null) {
    const query: Record<string, any> = { chatId: new ObjectId(chatId) };
    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    return this.messageModel.find(query).sort({ _id: -1 }).limit(limit);
  }

  public async findById(id: string | ObjectId) {
    return this.messageModel.findById(id);
  }

  public async findOne(query: Record<string, any>) {
    return this.messageModel.findOne(query);
  }

  public async create(data: Partial<IMessage>, options: any = {}): Promise<IMessage> {
    return new this.messageModel(data).save(options);
  }

  public async updateOne(query: Record<string, any>, update: any) {
    return this.messageModel.updateOne(query, update);
  }
}
export const messageRepository = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === "string" && prop !== "then") {
      return () => {};
    }
    return target[prop];
  },
  has: (target, prop) => true,
});
