import express from 'express';
const router = express.Router();

import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';

import { authenticateToken } from '../middlewares/auth.middleware.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';

router.use(authenticateToken);

// Upload avatar
router.post('/avatar', async (req, res) => {
    // TODO: Add logic to upload avatar
});

// Get user
router.get('/me', async (req, res) => {
    const user = await User.findById(req.user.id).select('-password -__v');
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

// Update user profile
router.patch('/profile', async (req, res) => {
    // TODO: Add logic to update user profile along with avatar image
});

// search by exact username
router.get('/search', async (req, res) => {
    const user = await User.findByEmailorUsername(req.query.username);
    if (!user) {
        throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }
    res.json(success(user));
});

export default router;
