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
import { AuthService } from "@services/auth/auth.service";
import { ChatActionService } from "@services/chat/chat-action.service";
import { ChatListingService } from "@services/chat/chat-listing.service";
import { ChatService } from "@services/chat/chat.service";
import { ChatLockdownService } from "@services/chat/chat-lockdown.service";
import { MessageService } from "@services/chat/message.service";
import { NotificationService } from "@services/notification/notification.service";
import { UserService } from "@services/auth/user.service";
import { UserCacheService } from "@services/auth/user-cache.service";
import { EmailService } from "@services/notification/email.service";
import { IUserCacheService } from "@services/interfaces/user-cache.service";
import { AuthController } from "@controllers/auth.controller";
import { ChatController } from "@controllers/chat.controller";
import { NotificationController } from "@controllers/notification.controller";
import { UserController } from "@controllers/user.controller";
import { SocketController } from "@controllers/socket.controller";
import { SocketService } from "@services/chat/socket.service";
import { ImageService } from "@services/infra/image.service";
import { RedisBaseService } from "@services/infra/redis/base";
import { RedisGuardService } from "@services/infra/redis/guard";
import { RedisPresenceService } from "@services/infra/redis/presence";
import { RedisSessionService } from "@services/infra/redis/session";
import { PresenceService } from "@services/presence/presence.service";
import { MessageHandler } from "@services/socket-handlers/message.handler";
import { ReactionHandler } from "@services/socket-handlers/reaction.handler";
import { TypingHandler } from "@services/socket-handlers/typing.handler";
import { PolicyService } from "@services/auth/policy.service";
import { ChatCacheService } from "@services/chat/chat-cache.service";
export class Registry {
  // Infrastructure
  public readonly redisBaseService = new RedisBaseService();
  public readonly redisPresenceService = new RedisPresenceService(this.redisBaseService);
  public readonly redisSessionService = new RedisSessionService(this.redisBaseService);
  public readonly redisGuardService = new RedisGuardService(this.redisBaseService);

  // Repositories
  public readonly userRepo = new UserRepository(User);
  public readonly chatRepo = new ChatRepository(Chat);
  public readonly messageRepo = new MessageRepository(Message);
  public readonly chatQueryRepo = new ChatQueryRepository(Chat);
  public readonly partnerRepo = new PartnerRepository(Chat);
  public readonly notificationRepo = new NotificationRepository(Notification);

  // Core Services
  public readonly chatLockdownService = new ChatLockdownService(this.redisGuardService, this.redisSessionService);

  public readonly authService = new AuthService(this.userRepo, this.redisSessionService);

  public readonly chatListingService = new ChatListingService(this.chatRepo, this.chatQueryRepo);

  public readonly chatActionService = new ChatActionService(
    this.chatRepo,
    this.userRepo,
    this.chatLockdownService,
    this.redisSessionService,
  );

  public readonly messageService = new MessageService(
    this.chatRepo,
    this.messageRepo,
    this.chatLockdownService,
    this.redisPresenceService,
    this.redisGuardService,
  );

  public readonly notificationService = new NotificationService(this.notificationRepo);
  public readonly emailService = new EmailService();
  public readonly userService = new UserService(this.userRepo, this.redisSessionService);
  public readonly userCacheService = new UserCacheService(this.userRepo, this.redisBaseService);

  public readonly chatService = new ChatService(this.chatListingService, this.chatActionService, this.messageService);

  public readonly policyService = new PolicyService();
  public readonly chatCacheService = new ChatCacheService();

  public readonly socketService: SocketService;

  public readonly imageService = new ImageService();

  // Controllers
  public readonly authController = new AuthController(this.authService);
  public readonly chatController = new ChatController(this.chatService);
  public readonly notificationController = new NotificationController(this.notificationService);
  public readonly userController = new UserController(this.userService, this.imageService);
  public readonly socketController: SocketController;

  constructor() {
    const ioProvider = () => this.socketService?.io || null;

    const presenceService = new PresenceService(ioProvider, this.userRepo, this.redisPresenceService);
    const messageHandler = new MessageHandler(ioProvider, this.messageService);
    const reactionHandler = new ReactionHandler(
      ioProvider,
      this.chatRepo,
      this.messageRepo,
      this.messageService,
      this.redisGuardService,
    );
    const typingHandler = new TypingHandler(ioProvider, this.chatRepo, this.messageService, this.redisGuardService);

    this.socketService = new SocketService(
      this.chatRepo,
      this.messageRepo,
      this.userRepo,
      this.chatQueryRepo,
      this.partnerRepo,
      this.messageService,
      presenceService,
      messageHandler,
      reactionHandler,
      typingHandler,
      this.redisSessionService,
      this.redisPresenceService,
      this.redisBaseService,
      this.policyService,
      this.chatCacheService,
    );

    this.socketController = new SocketController(
      this.socketService,
      this.redisPresenceService,
      this.userCacheService,
    );
  }
}

export const registry = new Registry();
