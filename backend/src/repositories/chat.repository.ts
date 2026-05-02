import Chat, { IChat, IChatModel } from "@models/chat.model";
import { ChatDto } from "@root/shared/types/chat.dto";
import { ObjectId } from "mongodb";

export class ChatRepository {
  constructor(public chatModel: IChatModel) {}

  public async findById(id: string | ObjectId) {
    return this.chatModel.findById(id);
  }

  public async findByIdWithSelect(id: string | ObjectId, select: string, lean = true) {
    const query = this.chatModel.findById(id).select(select);
    return lean ? query.lean() : query;
  }

  public async findPartnerChats(userId: string | ObjectId, excludeDeleted: boolean) {
    const filter: Record<string, any> = {
      participants: new ObjectId(userId),
      status: "accepted",
    };
    if (excludeDeleted) {
      filter.isDeleted = false;
    }

    return this.chatModel.find(filter).select("participants").lean();
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

  public transformChat(chat: IChat, userId: string | ObjectId): ChatDto {
    const userIdStr = userId.toString();
    const unread = chat.unreadCounts?.get?.(userIdStr) || 0;

    let otherUser: any = null;
    if (!chat.isGroup) {
      otherUser = chat.participants.find((p: any) => p._id && p._id.toString() !== userIdStr);
    }

    return {
      id: chat._id.toString(),
      status: chat.status,
      isGroup: chat.isGroup,
      createdBy: chat.createdBy.toString(),
      otherUser: otherUser
        ? {
            id: otherUser._id?.toString() || (otherUser as unknown as ObjectId).toString(),
            username: otherUser.username,
            name: otherUser.name || null,
            email: otherUser.email,
            avatarUrl: otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}`,
            plan: otherUser.plan,
            bio: otherUser.bio,
          }
        : null,
      lastMessage: chat.lastMessage?.contentBody
        ? {
            contentBody: chat.lastMessage.contentBody,
            senderId: chat.lastMessage.senderId?.toString() || null,
            sentAt: chat.lastMessage.sentAt,
          }
        : null,
      unreadCount: unread,
      createdAt: chat.createdAt,
      participants: chat.participants.map((p) => p.toString()),
    };
  }

  /**
   * Complex Search Aggregation
   */
  public async searchChats(userId: ObjectId, query: string, limit: number, cursorObj: { t: Date; id: string } | null) {
    const q = new RegExp("^" + query, "i");
    const pipeline: any[] = [
      {
        $match: {
          participants: userId,
          isDeleted: false,
          status: "accepted",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { participants: "$participants" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $in: ["$_id", "$$participants"] }, { $ne: ["$_id", userId] }],
                },
                $or: [{ username: q }, { name: q }, { email: q }],
              },
            },
            { $limit: 1 },
            { $project: { username: 1, name: 1, email: 1, avatar_url: 1, plan: 1, bio: 1 } },
          ],
          as: "otherUser",
        },
      },
      { $unwind: "$otherUser" },
      {
        $addFields: {
          sortTime: { $ifNull: ["$lastMessage.sentAt", "$createdAt"] },
        },
      },
    ];

    if (cursorObj) {
      pipeline.push({
        $match: {
          $or: [
            { sortTime: { $lt: cursorObj.t } },
            {
              $and: [{ sortTime: { $eq: cursorObj.t } }, { _id: { $lt: new ObjectId(cursorObj.id) } }],
            },
          ],
        },
      });
    }

    pipeline.push({ $sort: { sortTime: -1, _id: -1 } });
    pipeline.push({ $limit: limit + 1 });

    pipeline.push({
      $project: {
        id: { $toString: "$_id" },
        status: 1,
        isGroup: 1,
        createdBy: { $toString: "$createdBy" },
        participants: 1,
        otherUser: {
          id: { $toString: "$otherUser._id" },
          username: "$otherUser.username",
          name: "$otherUser.name",
          email: "$otherUser.email",
          avatarUrl: "$otherUser.avatar_url",
          plan: "$otherUser.plan",
          bio: "$otherUser.bio",
        },
        lastMessage: "$lastMessage",
        unreadCount: {
          $let: {
            vars: {
              unread: {
                $filter: {
                  input: { $objectToArray: "$unreadCounts" },
                  cond: { $eq: ["$$this.k", { $toString: userId }] },
                },
              },
            },
            in: { $ifNull: [{ $arrayElemAt: ["$$unread.v", 0] }, 0] },
          },
        },
        createdAt: 1,
        sortTime: 1,
      },
    });

    return this.chatModel.aggregate(pipeline);
  }

  public async findAcceptedChatsByUser(userId: string | ObjectId, query: Record<string, any>, limit: number) {
    return this.chatModel
      .find(query)
      .sort({ "lastMessage.sentAt": -1, _id: -1 })
      .limit(limit)
      .populate("participants", "username name email avatar_url plan bio");
  }

  public async findPendingRequestsByUser(userId: string | ObjectId, query: Record<string, any>, limit: number) {
    return this.chatModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate("participants", "username name email avatar_url plan bio");
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

  public async updateLastMessage(
    chatId: string | ObjectId,
    senderId: string | ObjectId,
    contentBody: string,
    recipients?: string | ObjectId | (string | ObjectId)[],
  ) {
    const chatIdObj = new ObjectId(chatId);
    const update: any = {
      $set: {
        lastMessage: {
          contentBody,
          senderId: new ObjectId(senderId),
          sentAt: new Date(),
        },
      },
    };

    if (recipients) {
      const recipientIds = Array.isArray(recipients) ? recipients : [recipients];
      if (recipientIds.length > 0) {
        update.$inc = {};
        recipientIds.forEach((id) => {
          update.$inc[`unreadCounts.${id.toString()}`] = 1;
        });
      }
    }

    return this.chatModel.findOneAndUpdate({ _id: chatIdObj }, update, { returnDocument: "after" });
  }

  public async findOneAndUpdate(query: Record<string, any>, update: any) {
    return this.chatModel.findOneAndUpdate(query, update, { returnDocument: "after" });
  }

  public async create(data: Partial<IChat>) {
    return this.chatModel.create(data);
  }

  public async updateById(id: string | ObjectId, update: any, options: any = {}): Promise<IChat | null> {
    return this.chatModel.findByIdAndUpdate(id, update, { ...options, returnDocument: "after" }) as Promise<IChat | null>;
  }

  // ─── Partner & Presence Helpers ────────────────────────────────────

  private partnerCache = new Map<string, { ids: Set<string>; t: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000;

  public async getPartnerIds(userId: string, excludeDeleted = false): Promise<Set<string>> {
    const cacheKey = excludeDeleted ? `${userId}:active` : userId;
    const cached = this.partnerCache.get(cacheKey);
    if (cached && Date.now() - cached.t < this.CACHE_TTL) {
      return cached.ids;
    }

    const filter: any = { participants: userId, status: "accepted" };
    if (excludeDeleted) filter.isDeleted = false;

    const chats = await this.chatModel.find(filter).select("participants").lean();
    const partners = new Set<string>();

    for (const chat of chats as any) {
      for (const p of chat.participants) {
        const pId = p.toString();
        if (pId !== userId) {
          partners.add(pId);
        }
      }
    }

    this.partnerCache.set(cacheKey, { ids: partners, t: Date.now() });
    return partners;
  }

  public invalidatePartnerCache(userId: string) {
    this.partnerCache.delete(userId);
    this.partnerCache.delete(`${userId}:active`);
  }
}

export const chatRepository = new ChatRepository(Chat);
