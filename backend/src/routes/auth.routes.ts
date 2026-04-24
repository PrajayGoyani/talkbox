import { RATE_LIMIT_AUTH_MAX } from "@config/env";
import { signup, login, refresh, getMe, logout, upgradeToPro } from "@controllers/auth.controller";
import { authenticateToken } from "@middlewares/auth.middleware";
import { createRateLimiter } from "@middlewares/rate-limiter.middleware";
import { validate } from "@middlewares/validate.middleware";
import { signupSchema, loginSchema } from "@schemas/user.schema";
import express from "express";

const router = express.Router();

const authRateLimiter = createRateLimiter(RATE_LIMIT_AUTH_MAX, 60000, "auth");

router.post("/signup", authRateLimiter, validate(signupSchema), signup);

router.post("/login", authRateLimiter, validate(loginSchema), login);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.get("/me", authenticateToken, getMe);

router.post("/upgrade-pro", authenticateToken, upgradeToPro);

export default router;
