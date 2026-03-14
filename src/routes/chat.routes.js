import express from 'express';
const router = express.Router();

import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';

// Get chat listing
router.get('/', async (req, res) => {
    // TODO: Add logic to get chat listing
});

// Create chat
router.post('/', async (req, res) => {
    // TODO: Add logic to create chat
});

// Update chat
router.put('/:id', async (req, res) => {
    // TODO: Add logic to update chat
});

// Delete chat
router.delete('/:id', async (req, res) => {
    // TODO: Add logic to delete chat with chat messages
});

// Get chat messages
router.get('/:chatId/messages', async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);
    const messages = await Message.find({ chat: chat._id });
    res.json(messages);
});

export default router;
