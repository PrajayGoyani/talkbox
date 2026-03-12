import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { JWT_SECRET_KEY, JWT_EXPIRATION } from '../config/env.js';
import User from '../models/user.model.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(user, JWT_SECRET_KEY, { expiresIn: JWT_EXPIRATION });

    delete user.password;
    res.json({ token, data: { user }});
});

export default router;
