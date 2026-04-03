import express from 'express';
const router = express.Router();

import { validate } from '../middlewares/validate.middleware.js';
import { createChatSchema, chatRequestSchema } from '../schemas/chat.schema.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

import { rateLimiter } from '../middlewares/rate-limiter.middleware.js';
import { isChatActive } from '../middlewares/is-chat-active.middleware.js';

import {
    getChatListing,
    createChat,
    requestChat,
    acceptChat,
    rejectChat,
    updateChat,
    deleteChat,
    getChatMessages,
    markChatRead,
    searchChats
} from '../controllers/chat.controller.js';

router.use(authenticateToken);
router.use(rateLimiter);

// Get chat listing (active + pending)
router.get('/', getChatListing);

// Search active chats
router.get('/search', searchChats);

// Send a chat request by username
router.post('/request', validate(chatRequestSchema), requestChat);

// Accept a pending chat request
router.put('/:chatId/accept', acceptChat);

// Reject a pending chat request
router.put('/:chatId/reject', rejectChat);

// Legacy: Create chat directly
router.post('/', isChatActive, validate(createChatSchema), createChat);

// Update chat
router.put('/:chatId', isChatActive, updateChat);

// Delete chat
router.delete('/:chatId', isChatActive, deleteChat);

// Get chat messages
router.get('/:chatId/messages', isChatActive, getChatMessages);

// Mark chat as read for current user
router.put('/:chatId/read', markChatRead);

export default router;
