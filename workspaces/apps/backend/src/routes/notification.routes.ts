import { registry } from "@bootstrap/registry";
import { authenticateToken } from "@middlewares/auth.middleware";
import express from "express";

const router = express.Router();

router.use(authenticateToken);

// Get paginated notifications
router.get("/", registry.notificationController.getNotifications);

// Mark all as read
router.put("/read-all", registry.notificationController.markAllAsRead);

// Mark single notification as read
router.put("/:id/read", registry.notificationController.markAsRead);

export default router;
