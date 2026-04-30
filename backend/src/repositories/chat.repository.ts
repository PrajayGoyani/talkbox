import Chat, { IChat, IChatModel } from "@models/chat.model";
import { ObjectId } from "mongodb";

import { ChatDto } from "@/types/chat.types";

export class ChatRepository {
  constructor(public chatModel: IChatModel) {}

  public async findById(id: string | ObjectId) {
    return this.chatModel.findById(id);
  }

  public async findOne(query: any) {
    return this.chatModel.findOne(query);
  }

  public async countDocuments(query: any) {
    return this.chatModel.countDocuments(query);
  }

  public decodeCursor(cursor: string) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
      if (!ObjectId.isValid(decoded.id)) return null;
      return { t: new Date(decoded.t), id: decoded.id };
    } catch (_e) {
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
      otherUser = chat.participants.find((p: any) => p._id.toString() !== userIdStr);
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
}

export const chatRepository = new ChatRepository(Chat);
