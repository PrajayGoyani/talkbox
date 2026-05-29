import { registry } from "@bootstrap/registry/registry";
import { authenticateToken } from "@middlewares/auth.middleware";
import { rateLimiter } from "@middlewares/rate-limiter.middleware";
import { validate, validateQuery } from "@middlewares/validate.middleware";
import { ensureVerified } from "@middlewares/verification.middleware";
import { chatRequestSchema, chatSearchSchema, chatRetentionSchema } from "@schemas/chat.schema";
import { rateLimiters } from "@config/rate-limiters";
import { Router } from "express";
const router = Router();
const chatController = registry.chatController;

router.use(authenticateToken);
router.use(rateLimiter);

// Get chat listing (active only)
router.get("/", chatController.getChatListing);

// Get pending chat requests
router.get("/requests", chatController.getChatRequests);

// Search active chats
router.get("/search", validateQuery(chatSearchSchema), chatController.searchChats);

// Get single chat by ID
router.get("/:chatId", chatController.getChat);

// Send a chat request by username
router.post("/request", ensureVerified, validate(chatRequestSchema), chatController.requestChat);

// Accept a pending chat request
router.put("/:chatId/accept", ensureVerified, chatController.acceptChat);

// Reject a pending chat request
router.put("/:chatId/reject", chatController.rejectChat);

// Delete chat
router.delete("/:chatId", chatController.deleteChat);

// Update chat retention period (rate-limited to 10 requests per minute)
router.put(
  "/:chatId/retention",
  ensureVerified,
  rateLimiters.retention,
  validate(chatRetentionSchema),
  chatController.updateRetentionPeriod,
);

// Get chat messages
router.get("/:chatId/messages", chatController.getChatMessages);

// Mark chat as read for current user
router.put("/:chatId/read", chatController.markChatRead);

export default router;
