import { RATE_LIMIT_AUTH_MAX } from "@config/env";
import {
  forgotPassword,
  getMe,
  login,
  logout,
  refresh,
  resendVerification,
  resetPassword,
  signup,
  upgradeToPro,
  verifyEmail,
} from "@controllers/auth.controller";
import { authenticateToken } from "@middlewares/auth.middleware";
import { createRateLimiter } from "@middlewares/rate-limiter.middleware";
import { validate } from "@middlewares/validate.middleware";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@schemas/user.schema";
import express from "express";

const router = express.Router();

const authRateLimiter = createRateLimiter(RATE_LIMIT_AUTH_MAX, 60000, "auth");

router.post("/signup", authRateLimiter, validate(signupSchema), signup);

router.post("/login", authRateLimiter, validate(loginSchema), login);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.get("/me", authenticateToken, getMe);

router.post("/upgrade-pro", authenticateToken, upgradeToPro);

// Password Reset (public, rate-limited)
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), resetPassword);

// Email Verification
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authenticateToken, resendVerification);

export default router;
