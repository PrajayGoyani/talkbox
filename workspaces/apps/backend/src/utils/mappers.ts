import { CHAT_MESSAGES } from "@constants/messages";
import { IChat } from "@models/chat.model";
import { IMessage } from "@models/message.model";
import { ObjectId } from "mongodb";
import { ChatDto, MessageDto } from "shared/types/chat.dto";

import { isScrubbed } from "./date.utils";
import { extractEmojiMetadata } from "./emoji.utils";

export const toChatDto = (chat: IChat, userId: string | ObjectId): ChatDto => {
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
  };
};

export const toMessageDto = (
  m: IMessage,
  plan: "free" | "pro" = "free",
  sender?: { name?: string | null; username: string; avatarUrl?: string | null },
): MessageDto => {
  const msg = "toObject" in m && typeof m.toObject === "function" ? m.toObject() : m;
  const isMessageScrubbed = isScrubbed(plan, msg.createdAt);

  const dto: MessageDto = {
    id: msg._id.toString(),
    chatId: msg.chatId.toString(),
    senderId: msg.senderId.toString(),
    contentBody: msg.contentBody,
    attachment: msg.attachment
      ? {
          kind: msg.attachment.kind,
          url: msg.attachment.url,
        }
      : undefined,
    isDeleted: msg.isDeleted,
    deletedAt: msg.deletedAt,
    isEdited: msg.isEdited,
    editedAt: msg.editedAt,
    createdAt: msg.createdAt,
    idempotencyKey: msg.idempotencyKey,
    reactions: (msg.reactions as any[])?.map((r) => ({
      emoji: r.emoji,
      slug: r.slug,
      users: (r.users as any[]).map((u) => u.toString()),
    })),
    senderName: sender?.name,
    senderUsername: sender?.username,
    senderAvatar: sender?.avatarUrl,
  };

  if (msg.isDeleted) {
    dto.contentBody = CHAT_MESSAGES.MESSAGE_DELETED;
    dto.reactions = [];
    dto.attachment = { kind: null, url: null };
  } else if (isMessageScrubbed) {
    dto.contentBody = "Message unavailable on Free plan.";
    dto.reactions = [];
    dto.attachment = { kind: null, url: null };
    dto.isScrubbed = true;
  }

  const skipEmojiMetadata: boolean = msg.isDeleted || isMessageScrubbed;
  dto.emojiMetadata = skipEmojiMetadata ? undefined : extractEmojiMetadata(dto.contentBody);

  return dto;
};
