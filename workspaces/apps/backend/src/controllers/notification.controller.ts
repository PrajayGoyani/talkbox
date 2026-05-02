import { notificationService } from "@services/notification.service";
import { Request, Response } from "express";

export const getNotifications = async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit || req.headers["x-limit"]) as string) || 15, 50);
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;

  const result = await notificationService.getByUser(req.user!.id, { limit, cursor });
  res.success(result);
};

export const markAsRead = async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.params.id as string, req.user!.id);
  res.success(notification);
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user!.id);
  res.success(result);
};
