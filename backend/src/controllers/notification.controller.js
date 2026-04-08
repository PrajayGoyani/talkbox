import { notificationService } from "../services/notification.service.js";

export const getNotifications = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 15, 50);
  const skip = parseInt(req.query.skip) || 0;

  const result = await notificationService.getByUser(req.user.id, { limit, skip });
  res.success(result);
};

export const markAsRead = async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);
  res.success(notification);
};

export const markAllAsRead = async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.success(result);
};
