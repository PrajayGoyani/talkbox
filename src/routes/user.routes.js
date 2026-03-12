import express from 'express';
const router = express.Router();

import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';

import { authenticateToken } from '../middlewares/auth.middleware.js';

router.use(authenticateToken);

// Upload avatar
router.post('/avatar', async (req, res) => {
    const user = await User.findById(req.user.id);
    user.avatar = req.file.path;
    await user.save();
    res.json(user);
});

// Get user profile
router.get('/profile', async (req, res) => {
    const user = await User.findById(req.user.id);
    res.json(user);
});

// Update user profile
router.put('/profile', async (req, res) => {
    const user = await User.findById(req.user.id);
    user.name = req.body.name;
    user.email = req.body.email;
    await user.save();
    res.json(user);
});

export default router;
