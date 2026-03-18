import express from 'express';

import { signupSchema, loginSchema } from '../schemas/user.schema.js';

import { signup, login, refresh, getMe } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';



const router = express.Router();

router.post('/signup', validate(signupSchema), signup);

router.post('/login', validate(loginSchema), login);

router.post('/refresh', refresh);

router.get('/me', authenticateToken, getMe);

export default router;
