import express from 'express';
import bcrypt from 'bcrypt';

import User from '../models/user.model.js';
import { generateTokens, verifyToken } from '../utils/jwt.js';

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
    
    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        sameSite: 'None', secure: true,
        maxAge: 24 * 60 * 60 * 1000
    });

    delete user.password;
    res.json({ accessToken, data: { user }});
});

router.post('/refresh', async (req, res) => {
    if (req.cookies?.jwt) {

        const refreshToken = req.cookies.jwt;

        try {
            const decoded = verifyToken(refreshToken);
            const tokens = generateTokens(decoded);
            return res.json({ ...tokens });
        } catch (error) {
            return res.status(406).json({ message: 'Unauthorized' });
        }
    } else {
        return res.status(406).json({ message: 'Unauthorized' });
    }
});

export default router;
