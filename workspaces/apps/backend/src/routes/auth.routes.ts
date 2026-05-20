import { registry } from "@bootstrap/registry";
import { rateLimiters } from "@config/rate-limiters";
import { authenticateToken } from "@middlewares/auth.middleware";
import { validate } from "@middlewares/validate.middleware";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@schemas/user.schema";
import { Router } from "express";

const router = Router();
const auth = registry.authController;

router.post("/signup", rateLimiters.auth, validate(signupSchema), auth.signup);

router.post("/login", rateLimiters.auth, validate(loginSchema), auth.login);

router.post("/refresh", rateLimiters.authRefresh, auth.refresh);

router.post("/logout", authenticateToken, rateLimiters.logout, auth.logout);

router.get("/me", authenticateToken, auth.getMe);

router.post("/upgrade-pro", authenticateToken, auth.upgradeToPro);

// Password Reset (public, rate-limited)
router.post("/forgot-password", rateLimiters.passwordReset, validate(forgotPasswordSchema), auth.forgotPassword);
router.post("/reset-password", rateLimiters.auth, validate(resetPasswordSchema), auth.resetPassword);

// Email Verification
router.get("/verify-email", auth.verifyEmail);
router.post("/resend-verification", authenticateToken, rateLimiters.email, auth.resendVerification);

export default router;
