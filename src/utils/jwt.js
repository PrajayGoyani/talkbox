import {
    JWT_SECRET_KEY,
    JWT_EXPIRATION,
    JWT_REFRESH_SECRET_KEY,
    JWT_REFRESH_EXPIRATION
} from '../config/env.js';
import jwt from 'jsonwebtoken';

export const generateAccessToken = (payload) => jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: JWT_EXPIRATION });
export const generateRefreshToken = (payload) => jwt.sign(payload, JWT_REFRESH_SECRET_KEY, { expiresIn: JWT_REFRESH_EXPIRATION });

export function generateTokens(payload) {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    return { accessToken, refreshToken };
}

export const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET_KEY);
export const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET_KEY);