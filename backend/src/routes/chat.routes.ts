import express from "express";
const router = express.Router();

import {
  getChatListing,
  getChatRequests,
  requestChat,
  acceptChat,
  rejectChat,
  deleteChat,
  getChatMessages,
  markChatRead,
  searchChats,
} from "@controllers/chat.controller";
import { authenticateToken } from "@middlewares/auth.middleware";
import { rateLimiter } from "@middlewares/rate-limiter.middleware";
import { validate, validateQuery } from "@middlewares/validate.middleware";
import { chatRequestSchema, chatSearchSchema } from "@schemas/chat.schema";

router.use(authenticateToken);
router.use(rateLimiter);

// Get chat listing (active only)
router.get("/", getChatListing);

// Get pending chat requests
router.get("/requests", getChatRequests);

// Search active chats
router.get("/search", validateQuery(chatSearchSchema), searchChats);

// Send a chat request by username
router.post("/request", validate(chatRequestSchema), requestChat);

// Accept a pending chat request
router.put("/:chatId/accept", acceptChat);

// Reject a pending chat request
router.put("/:chatId/reject", rejectChat);

// Delete chat
router.delete("/:chatId", deleteChat);

// Get chat messages
router.get("/:chatId/messages", getChatMessages);

// Mark chat as read for current user
router.put("/:chatId/read", markChatRead);

export default router;
