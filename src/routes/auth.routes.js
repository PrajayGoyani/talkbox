import express from 'express';

import { signup, login, refresh } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { signupSchema, loginSchema } from '../schemas/user.schema.js';

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);

router.post('/login', validate(loginSchema), login);

router.post('/refresh', refresh);

export default router;
