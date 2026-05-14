import { INotificationService } from "@services/interfaces/notification.service";
import { Request, Response } from "express";

export class NotificationController {
  constructor(private notificationService: INotificationService) {}

  public getNotifications = async (req: Request, res: Response) => {
    const limit = Math.min(parseInt((req.query.limit || req.headers["x-limit"]) as string) || 15, 50);
    const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;

    const result = await this.notificationService.getByUser(req.user!.id, { limit, cursor });
    res.success(result);
  };

  public markAsRead = async (req: Request, res: Response) => {
    const notification = await this.notificationService.markAsRead(req.params.id as string, req.user!.id);
    res.success(notification);
  };

  public markAllAsRead = async (req: Request, res: Response) => {
    const result = await this.notificationService.markAllAsRead(req.user!.id);
    res.success(result);
  };
}
