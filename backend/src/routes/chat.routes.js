import express from 'express';
const router = express.Router();

import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';

import { validate } from '../middlewares/validate.middleware.js';
import { success } from '../utils/response.js';
import { createChatSchema } from '../schemas/chat.schema.js';

// Get chat listing
router.get('/', async (req, res) => {
    const chats = await Chat.find({ cretatedBy: req.user.id })
        .populate('reciverId', 'name email avatar_url');
    res.json(chats);
});


// Create chat
router.post('/', validate(createChatSchema), async (req, res) => {
    const { reciverId } = req.body;
    const chat = new Chat({
        reciverId,
        cretatedBy: req.user.id
    });

    await chat.save();
    res.status(201).json(success(chat));
});

// Update chat
router.put('/:chatId', async (req, res) => {
    // NOTE: Not in scope right now, we have only one-to-one chat,
    // so no need to update chat, we can only update messages
    // TODO: Add logic to update chat
});

// Delete chat
router.delete('/:chatId', async (req, res) => {
    // NOTE: should we implement soft delete?
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
