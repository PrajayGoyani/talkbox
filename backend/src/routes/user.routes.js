import express from 'express';
const router = express.Router();

import { authenticateToken } from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../middlewares/rate-limiter.middleware.js';
import { getMe, searchByUsername, uploadAvatar, updateProfile } from '../controllers/user.controller.js';

router.use(authenticateToken);
router.use(rateLimiter);

// Upload avatar
router.post('/avatar', uploadAvatar);

// Get user
router.get('/me', getMe);

// Update user profile
router.patch('/profile', updateProfile);

// search by exact username
router.get('/search', searchByUsername);

export default router;
