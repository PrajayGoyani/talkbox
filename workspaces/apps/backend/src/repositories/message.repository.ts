import Message, { IMessage, IMessageModel } from "@models/message.model";
import { ObjectId } from "mongodb";
import { MessageDto } from "shared/types/chat.dto";

export class MessageRepository {
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

  public transformMessage(
    m: IMessage,
    sender?: { name?: string | null; username: string; avatarUrl?: string | null },
  ): MessageDto {
    const msg = "toObject" in m && typeof m.toObject === "function" ? m.toObject() : m;

    return {
      ...msg,
      id: msg._id.toString(),
      chatId: msg.chatId.toString(),
      senderId: msg.senderId.toString(),
      reactions: (msg.reactions as any[])?.map((r) => ({
        emoji: r.emoji,
        slug: r.slug,
        users: (r.users as any[]).map((u) => u.toString()),
      })),
      senderName: sender?.name,
      senderUsername: sender?.username,
      senderAvatar: sender?.avatarUrl,
    } as MessageDto;
  }


  public async create(data: Partial<IMessage>, options: any = {}): Promise<IMessage> {
    return new this.messageModel(data).save(options);
  }

  public async updateOne(query: Record<string, any>, update: any) {
    return this.messageModel.updateOne(query, update);
  }
}

export const messageRepository = new MessageRepository(Message);
