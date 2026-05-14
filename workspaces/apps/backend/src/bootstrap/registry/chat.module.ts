import { ChatController } from "@controllers/chat.controller";
import { ChatActionService } from "@services/chat/chat-action.service";
import { ChatCacheService } from "@services/chat/chat-cache.service";
import { ChatListingService } from "@services/chat/chat-listing.service";
import { ChatLockdownService } from "@services/chat/chat-lockdown.service";
import { ChatService } from "@services/chat/chat.service";
import { MessageService } from "@services/chat/message.service";

import { InfraModule } from "./infra.module";
import { lazy } from "./lazy";
import { RepoModule } from "./repo.module";

export class ChatModule {
  constructor(
    private repos: RepoModule,
    private infra: InfraModule,
  ) {
    lazy(this, "chatListingService", () => new ChatListingService(this.repos.chatRepo, this.repos.chatQueryRepo));
    lazy(
      this,
      "chatLockdownService",
      () => new ChatLockdownService(this.infra.redisGuardService, this.infra.redisSessionService),
    );
    lazy(
      this,
      "chatActionService",
      () =>
        new ChatActionService(
          this.repos.chatRepo,
          this.repos.userRepo,
          this.chatLockdownService,
          this.infra.redisSessionService,
        ),
    );
    lazy(
      this,
      "messageService",
      () =>
        new MessageService(
          this.repos.chatRepo,
          this.repos.messageRepo,
          this.chatLockdownService,
          this.infra.redisPresenceService,
          this.infra.redisGuardService,
        ),
    );
    lazy(
      this,
      "chatService",
      () => new ChatService(this.chatListingService, this.chatActionService, this.messageService),
    );
    lazy(this, "chatCacheService", () => new ChatCacheService());
    lazy(this, "chatController", () => new ChatController(this.chatService));
  }

  declare chatListingService: ChatListingService;
  declare chatLockdownService: ChatLockdownService;
  declare chatActionService: ChatActionService;
  declare messageService: MessageService;
  declare chatService: ChatService;
  declare chatCacheService: ChatCacheService;
  declare chatController: ChatController;
}
