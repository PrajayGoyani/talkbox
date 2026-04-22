import { signup, login, refresh, getMe, logout, upgradeToPro } from "@controllers/auth.controller";
import { authenticateToken } from "@middlewares/auth.middleware";
import { validate } from "@middlewares/validate.middleware";
import { signupSchema, loginSchema } from "@schemas/user.schema";
import express from "express";

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);

router.post("/login", validate(loginSchema), login);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.get("/me", authenticateToken, getMe);

router.post("/upgrade-pro", authenticateToken, upgradeToPro);

export default router;
