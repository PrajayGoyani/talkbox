import {
    JWT_SECRET_KEY,
    JWT_EXPIRATION,
    JWT_REFRESH_SECRET_KEY,
    JWT_REFRESH_EXPIRATION
} from '../config/env.js';
import jwt from 'jsonwebtoken';

export function generateTokens(payload) {
    const accessToken = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: JWT_EXPIRATION });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET_KEY, { expiresIn: JWT_REFRESH_EXPIRATION });
    return { accessToken, refreshToken };
}

export const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET_KEY);
export const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET_KEY);