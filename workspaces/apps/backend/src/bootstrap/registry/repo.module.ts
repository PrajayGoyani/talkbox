import Chat from "@models/chat.model";
import Message from "@models/message.model";
import Notification from "@models/notification.model";
import User from "@models/user.model";
import { ChatQueryRepository } from "@repositories/chat-query.repository";
import { ChatRepository } from "@repositories/chat.repository";
import { MessageRepository } from "@repositories/message.repository";
import { NotificationRepository } from "@repositories/notification.repository";
import { PartnerRepository } from "@repositories/partner.repository";
import { UserRepository } from "@repositories/user.repository";

import { lazy } from "./lazy";

export class RepoModule {
  constructor() {
    lazy(this, "userRepo", () => new UserRepository(User));
    lazy(this, "chatRepo", () => new ChatRepository(Chat));
    lazy(this, "messageRepo", () => new MessageRepository(Message));
    lazy(this, "chatQueryRepo", () => new ChatQueryRepository(Chat));
    lazy(this, "partnerRepo", () => new PartnerRepository(Chat));
    lazy(this, "notificationRepo", () => new NotificationRepository(Notification));
  }

  declare userRepo: UserRepository;
  declare chatRepo: ChatRepository;
  declare messageRepo: MessageRepository;
  declare chatQueryRepo: ChatQueryRepository;
  declare partnerRepo: PartnerRepository;
  declare notificationRepo: NotificationRepository;
}
