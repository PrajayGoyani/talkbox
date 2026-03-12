import express from 'express';
const router = express.Router();

import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';

// Get chat listing
router.get('/', async (req, res) => {
    const user = await User.findById(req.user.id);
    const chats = await Chat.find({ users: user._id });
    res.json(chats);
});

// Create chat
router.post('/', async (req, res) => {
    const user = await User.findById(req.user.id);
    const chat = new Chat({ users: [user._id] });
    const newChat = await chat.save();
    res.json(newChat);
});

// Get chat messages
router.get('/:chatId/messages', async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);
    const messages = await Message.find({ chat: chat._id });
    res.json(messages);
});

export default router;
