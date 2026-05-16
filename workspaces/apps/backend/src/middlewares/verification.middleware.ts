import { AppError } from "@utils/AppError";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure the user's email is verified.
 * 
 * Restrictions apply ONLY to users who meet BOTH criteria:
 * 1. isEmailVerified === false
 * 2. plan === 'free'
 * 
 * Pro users and Verified users have full access.
 */
export const ensureVerified = (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user) {
    return next(AppError.unauthorized());
  }

  if (!user.isEmailVerified && user.plan === "free") {
    return next(AppError.verificationRequired("Please verify your email to perform this action."));
  }

  next();
};
