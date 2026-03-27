import express from 'express';
const router = express.Router();

import { validate } from '../middlewares/validate.middleware.js';
import { createChatSchema } from '../schemas/chat.schema.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

import { rateLimiter } from '../middlewares/rate-limiter.middleware.js';
import { isChatActive } from '../middlewares/is-chat-active.middleware.js';

import {
    getChatListing,
    createChat,
    updateChat,
    deleteChat,
    getChatMessages
} from '../controllers/chat.controller.js';

router.use(authenticateToken);
router.use(rateLimiter);
router.use(isChatActive);

// Get chat listing
router.get('/', getChatListing);

// Create chat
router.post('/', validate(createChatSchema), createChat);

// Update chat
router.put('/:chatId', updateChat);

// Delete chat
router.delete('/:chatId', deleteChat);

// Get chat messages
router.get('/:chatId/messages', getChatMessages);

export default router;
