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
  uploadAttachment,
  getChatAttachments,
  deleteChatAttachment,
} from "../controllers/chat.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { rateLimiter } from "../middlewares/rate-limiter.middleware";
import { validate } from "../middlewares/validate.middleware";
import { chatRequestSchema } from "../schemas/chat.schema";

router.use(authenticateToken);
router.use(rateLimiter);

// Get chat listing (active only)
router.get("/", getChatListing);

// Get pending chat requests
router.get("/requests", getChatRequests);

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

// Upload attachment
import { upload } from "../middlewares/upload.middleware";
router.post("/:chatId/attachment", upload.single("file"), uploadAttachment);

// Get paginated attachment list (for Media Gallery Drawer)
router.get("/:chatId/attachments", getChatAttachments);

// Delete a specific attachment from a message
router.delete("/:chatId/attachments/:messageId", deleteChatAttachment);

export default router;
