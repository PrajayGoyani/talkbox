import { SocketController } from "@controllers/socket.controller";
import { SocketService } from "@services/chat/socket.service";
import { PresenceService } from "@services/presence/presence.service";
import { MessageHandler } from "@services/socket-handlers/message.handler";
import { ReactionHandler } from "@services/socket-handlers/reaction.handler";
import { TypingHandler } from "@services/socket-handlers/typing.handler";

import { AuthModule } from "./auth.module";
import { ChatModule } from "./chat.module";
import { InfraModule } from "./infra.module";
import { lazy } from "./lazy";
import { RepoModule } from "./repo.module";

export class SocketModule {
  constructor(
    private repos: RepoModule,
    private infra: InfraModule,
    private auth: AuthModule,
    private chat: ChatModule,
  ) {
    lazy(this, "socketService", () => {
      const ioProvider = () => this.socketService?.io || null;

      const presenceService = new PresenceService(ioProvider, this.repos.userRepo, this.infra.redisPresenceService);
      const messageHandler = new MessageHandler(ioProvider, this.chat.messageService);
      const reactionHandler = new ReactionHandler(
        ioProvider,
        this.repos.chatRepo,
        this.repos.messageRepo,
        this.chat.messageService,
        this.infra.redisGuardService,
      );
      const typingHandler = new TypingHandler(
        ioProvider,
        this.repos.chatRepo,
        this.chat.messageService,
        this.infra.redisGuardService,
      );

      return new SocketService(
        this.repos.chatRepo,
        this.repos.messageRepo,
        this.repos.userRepo,
        this.repos.chatQueryRepo,
        this.repos.partnerRepo,
        this.chat.messageService,
        presenceService,
        messageHandler,
        reactionHandler,
        typingHandler,
        this.infra.redisSessionService,
        this.infra.redisPresenceService,
        this.infra.redisBaseService,
        this.auth.policyService,
        this.chat.chatCacheService,
      );
    });

    lazy(
      this,
      "socketController",
      () => new SocketController(this.socketService, this.infra.redisPresenceService, this.auth.userCacheService),
    );
  }

  declare socketService: SocketService;
  declare socketController: SocketController;
}
