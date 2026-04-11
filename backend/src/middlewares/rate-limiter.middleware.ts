import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

// Simple in-memory rate limiter per user
// A Map storing userId -> { count: number, resetTime: number }

const requestCounts = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

// Periodic cleanup of expired entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [userId, record] of requestCounts) {
    if (now >= record.resetTime) {
      requestCounts.delete(userId);
    }
  }
}, 5 * 60 * 1000); // every 5 minutes

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return next();
  }

  const currentTime = Date.now();
  let userRecord = requestCounts.get(userId);

  if (userRecord) {
    if (currentTime < userRecord.resetTime) {
      userRecord.count++;
      if (userRecord.count > MAX_REQUESTS) {
        return next(
          AppError.tooMany(
            "Strict limit of 100 messages per 1-minute window exceeded.",
            "RATE_LIMIT_EXCEEDED",
          ),
        );
      }
    } else {
      // Reset the window
      userRecord.count = 1;
      userRecord.resetTime = currentTime + WINDOW_MS;
    }
  } else {
    userRecord = { count: 1, resetTime: currentTime + WINDOW_MS };
  }
  requestCounts.set(userId, userRecord);

  next();
};

