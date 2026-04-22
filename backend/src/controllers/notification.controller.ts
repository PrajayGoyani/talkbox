import { notificationService } from "@services/notification.service";
import { Request, Response, NextFunction } from "express";

export const getNotifications = async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 15, 50);
  const skip = parseInt(req.query.skip as string) || 0;

  const result = await notificationService.getByUser(req.user!.id, { limit, skip });
  res.success(result);
};

export const markAsRead = async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user!.id);
  res.success(notification);
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user!.id);
  res.success(result);
};
