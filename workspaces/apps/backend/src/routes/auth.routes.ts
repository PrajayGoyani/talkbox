import { registry } from "@bootstrap/registry";
import { RATE_LIMIT_AUTH_MAX } from "@config/env";
import { authenticateToken } from "@middlewares/auth.middleware";
import { createRateLimiter } from "@middlewares/rate-limiter.middleware";
import { validate } from "@middlewares/validate.middleware";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@schemas/user.schema";
import { Router } from "express";

const router = Router();
const authController = registry.authController;

const authRateLimiter = createRateLimiter(RATE_LIMIT_AUTH_MAX, 60000, "auth");

router.post("/signup", authRateLimiter, validate(signupSchema), authController.signup);

router.post("/login", authRateLimiter, validate(loginSchema), authController.login);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.get("/me", authenticateToken, authController.getMe);

router.post("/upgrade-pro", authenticateToken, authController.upgradeToPro);

// Password Reset (public, rate-limited)
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Email Verification
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authenticateToken, authController.resendVerification);

export default router;
