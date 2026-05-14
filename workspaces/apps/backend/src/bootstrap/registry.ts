import { AuthController } from "@controllers/auth.controller";
import { ChatController } from "@controllers/chat.controller";
import { NotificationController } from "@controllers/notification.controller";
import { SocketController } from "@controllers/socket.controller";
import { UserController } from "@controllers/user.controller";
import { ChatQueryRepository } from "@repositories/chat-query.repository";
import { ChatRepository } from "@repositories/chat.repository";
import { MessageRepository } from "@repositories/message.repository";
import { NotificationRepository } from "@repositories/notification.repository";
import { PartnerRepository } from "@repositories/partner.repository";
import { UserRepository } from "@repositories/user.repository";
import { AuthService } from "@services/auth/auth.service";
import { PolicyService } from "@services/auth/policy.service";
import { UserCacheService } from "@services/auth/user-cache.service";
import { UserService } from "@services/auth/user.service";
import { ChatActionService } from "@services/chat/chat-action.service";
import { ChatCacheService } from "@services/chat/chat-cache.service";
import { ChatListingService } from "@services/chat/chat-listing.service";
import { ChatLockdownService } from "@services/chat/chat-lockdown.service";
import { ChatService } from "@services/chat/chat.service";
import { MessageService } from "@services/chat/message.service";
import { SocketService } from "@services/chat/socket.service";
import { ImageService } from "@services/infra/image.service";
import { RedisBaseService } from "@services/infra/redis/base";
import { RedisGuardService } from "@services/infra/redis/guard";
import { RedisPresenceService } from "@services/infra/redis/presence";
import { RedisSessionService } from "@services/infra/redis/session";
import { EmailService } from "@services/notification/email.service";
import { NotificationService } from "@services/notification/notification.service";

import { container } from "./registry/container";

export interface IRegistry {
  // Infra
  redisBaseService: RedisBaseService;
  redisPresenceService: RedisPresenceService;
  redisSessionService: RedisSessionService;
  redisGuardService: RedisGuardService;
  imageService: ImageService;

  // Repos
  userRepo: UserRepository;
  chatRepo: ChatRepository;
  messageRepo: MessageRepository;
  chatQueryRepo: ChatQueryRepository;
  partnerRepo: PartnerRepository;
  notificationRepo: NotificationRepository;

  // Services
  authService: AuthService;
  userService: UserService;
  userCacheService: UserCacheService;
  policyService: PolicyService;
  chatService: ChatService;
  chatListingService: ChatListingService;
  chatActionService: ChatActionService;
  messageService: MessageService;
  chatLockdownService: ChatLockdownService;
  chatCacheService: ChatCacheService;
  notificationService: NotificationService;
  emailService: EmailService;
  socketService: SocketService;

  // Controllers
  authController: AuthController;
  userController: UserController;
  chatController: ChatController;
  notificationController: NotificationController;
  socketController: SocketController;
}

/**
 * Registry Proxy: Automatically delegates property access to the appropriate domain module.
 * This eliminates the need for manual forwarding getters.
 */
export const registry = new Proxy({} as IRegistry, {
  get: (target, prop: string) => {
    // Try modules in order of likely usage
    return (
      (container.auth as any)[prop] ||
      (container.chat as any)[prop] ||
      (container.socket as any)[prop] ||
      (container.notification as any)[prop] ||
      (container.repos as any)[prop] ||
      (container.infra as any)[prop]
    );
  },
});
