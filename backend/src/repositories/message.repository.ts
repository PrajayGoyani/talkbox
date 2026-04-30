import Message, { IMessage, IMessageModel } from "@models/message.model";
import { getScrubCutoff } from "@utils/date.utils";
import { extractEmojiMetadata } from "@utils/emoji.utils";
import { ObjectId } from "mongodb";

import { MessageDto } from "@root/shared/types/chat.dto";

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

  public transformMessage(m: IMessage, plan: "free" | "pro" = "free"): MessageDto {
    const msg = m.toObject();
    const scrubCutoff = getScrubCutoff();
    const isOlderThanLimit = m.createdAt < scrubCutoff;

    if (msg.isDeleted) {
      msg.contentBody = "This message was deleted";
      msg.reactions = [];
      msg.attachment = { kind: null, url: null };
    } else if (plan === "free" && isOlderThanLimit) {
      msg.contentBody = "Message unavailable on Free plan.";
      msg.reactions = [];
      msg.attachment = { kind: null, url: null };
      msg.isScrubbed = true;
    }

    const skipEmojiMetadata: boolean = msg.isDeleted || (plan === "free" && isOlderThanLimit);
    const emojiMetadata = skipEmojiMetadata ? undefined : extractEmojiMetadata(msg.contentBody);

    return {
      ...msg,
      id: msg._id.toString(),
      chatId: msg.chatId.toString(),
      senderId: msg.senderId.toString(),
      emojiMetadata,
      reactions: (msg.reactions as any[])?.map((r) => ({
        emoji: r.emoji,
        slug: r.slug,
        users: (r.users as any[]).map((u) => u.toString()),
      })),
    } as MessageDto;
  }

  public async create(data: Partial<IMessage>) {
    return this.messageModel.create(data);
  }

  public async updateOne(query: Record<string, any>, update: any) {
    return this.messageModel.updateOne(query, update);
  }
}

export const messageRepository = new MessageRepository(Message);
