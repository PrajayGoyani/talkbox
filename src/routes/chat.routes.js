import express from 'express';
const router = express.Router();

import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';

import { validate } from '../utils/validation.js';

// Get chat listing
router.get('/', async (req, res) => {
    const chats = await Chat.find({ cretatedBy: req.user._id })
        .populate('reciverId', 'name email avatar_url');
    res.json(chats);
});

const createChatSchema = {
    reciverId: { type: 'string', required: true }
};

// Create chat
router.post('/', validate(createChatSchema), async (req, res) => {
    const { reciverId } = req.body;
    const chat = new Chat({
        reciverId,
        cretatedBy: req.user._id
    });

    await chat.save();
    res.status(201).json(chat);
});

// Update chat
router.put('/:id', async (req, res) => {
    // NOTE: Not in scope right now, we have only one-to-one chat,
    // so no need to update chat, we can only update messages
    // TODO: Add logic to update chat
});

// Delete chat
router.delete('/:id', async (req, res) => {
    // NOTE: Can we add here soft delete
    // or we also need to delete all messages related to this chat
    // TODO: Add logic to delete chat with chat messages
});

// Get chat messages
router.get('/:chatId/messages', async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);
    const messages = await Message.find({ chat: chat._id });
    res.json(messages);
});

export default router;
