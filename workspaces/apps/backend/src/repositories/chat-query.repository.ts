import Chat, { IChat, IChatModel } from "@models/chat.model";
import { toChatDto } from "@utils/mappers";
import { ObjectId } from "mongodb";
import { ChatDto } from "shared/types/chat.dto";

import { IChatQueryRepository } from "./interfaces/chat-query.repository";

export class ChatQueryRepository implements IChatQueryRepository {
  constructor(public chatModel: IChatModel) {}

  public async findPartnerChats(userId: string | ObjectId, excludeDeleted: boolean) {
    const filter: Record<string, any> = {
      participants: new ObjectId(userId),
      status: { $in: ["accepted", "pending"] },
    };
    if (excludeDeleted) {
      filter.isDeleted = false;
    }

    return this.chatModel.find(filter).select("participants").lean();
  }

  public transformChat(chat: IChat, userId: string | ObjectId): ChatDto {
    return toChatDto(chat, userId);
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
            { $project: { username: 1, name: 1, avatar_url: 1, plan: 1, bio: 1 } },
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
        otherUser: {
          id: { $toString: "$otherUser._id" },
          username: "$otherUser.username",
          name: "$otherUser.name",
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
        retentionPeriod: 1,
      },
    });

    return this.chatModel.aggregate(pipeline);
  }

  public async findAcceptedChatsByUser(userId: string | ObjectId, query: Record<string, any>, limit: number) {
    return this.chatModel
      .find(query)
      .sort({ "lastMessage.sentAt": -1, _id: -1 })
      .limit(limit)
      .populate("participants", "username name avatar_url plan bio");
  }

  public async findPendingRequestsByUser(userId: string | ObjectId, query: Record<string, any>, limit: number) {
    return this.chatModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate("participants", "username name avatar_url plan bio");
  }

  public async findByIdWithParticipants(chatId: string | ObjectId) {
    return this.chatModel.findById(chatId).populate("participants", "username name avatar_url plan bio");
  }
}
