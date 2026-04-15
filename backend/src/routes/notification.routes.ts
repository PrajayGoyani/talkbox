import express from "express";

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(authenticateToken);

// Get paginated notifications
router.get("/", getNotifications);

// Mark all as read
router.put("/read-all", markAllAsRead);

// Mark single notification as read
router.put("/:id/read", markAsRead);

export default router;
