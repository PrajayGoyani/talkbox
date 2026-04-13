import jwt from "jsonwebtoken";

import { JWT_SECRET_KEY, JWT_EXPIRATION, JWT_REFRESH_SECRET_KEY, JWT_REFRESH_EXPIRATION } from "../config/env";

export const generateAccessToken = (payload: object) =>
  jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: JWT_EXPIRATION as any });
export const generateRefreshToken = (payload: object) =>
  jwt.sign(payload, JWT_REFRESH_SECRET_KEY, { expiresIn: JWT_REFRESH_EXPIRATION as any });

export function generateTokens(payload: object) {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
}

export const verifyAccessToken = (token: string) => jwt.verify(token, JWT_SECRET_KEY);
export const verifyRefreshToken = (token: string) => jwt.verify(token, JWT_REFRESH_SECRET_KEY);
