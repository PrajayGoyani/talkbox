import express from "express";
const router = express.Router();

import { validate } from "../middlewares/validate.middleware.js";
import { chatRequestSchema } from "../schemas/chat.schema.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { rateLimiter } from "../middlewares/rate-limiter.middleware.js";

import {
  getChatListing,
  requestChat,
  acceptChat,
  rejectChat,
  deleteChat,
  getChatMessages,
  markChatRead,
  searchChats,
} from "../controllers/chat.controller.js";

router.use(authenticateToken);
router.use(rateLimiter);

// Get chat listing (active + pending)
router.get("/", getChatListing);

// Search active chats
router.get("/search", searchChats);

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

