import { NotificationController } from "@controllers/notification.controller";
import { EmailService } from "@services/notification/email.service";
import { NotificationService } from "@services/notification/notification.service";

import { lazy } from "./lazy";
import { RepoModule } from "./repo.module";

export class NotificationModule {
  constructor(private repos: RepoModule) {
    lazy(this, "notificationService", () => new NotificationService(this.repos.notificationRepo));
    lazy(this, "emailService", () => new EmailService());
    lazy(this, "notificationController", () => new NotificationController(this.notificationService));
  }

  declare notificationService: NotificationService;
  declare emailService: EmailService;
  declare notificationController: NotificationController;
}
