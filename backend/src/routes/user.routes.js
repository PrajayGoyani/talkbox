import express from 'express';
const router = express.Router();

import { authenticateToken } from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../middlewares/rate-limiter.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateProfileSchema } from '../schemas/user.schema.js';
import { getMe, searchByUsername, uploadAvatar, updateProfile } from '../controllers/user.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

router.use(authenticateToken);
router.use(rateLimiter);

// Upload avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// Get user
router.get('/me', getMe);

// Update user profile
router.patch('/profile', validate(updateProfileSchema), updateProfile);

// search by exact username
router.get('/search', searchByUsername);

export default router;
