import express from "express";
const router = express.Router();

import { registry } from "@bootstrap/registry";
import { authenticateToken } from "@middlewares/auth.middleware";
import { rateLimiter } from "@middlewares/rate-limiter.middleware";
import { memoryUpload } from "@middlewares/upload.middleware";
import { validate } from "@middlewares/validate.middleware";
import { updateProfileSchema } from "@schemas/user.schema";

router.use(authenticateToken);
router.use(rateLimiter);

// Upload avatar
router.post("/avatar", memoryUpload.single("avatar"), registry.userController.uploadAvatar);

// Update user profile
router.patch("/profile", validate(updateProfileSchema), registry.userController.updateProfile);

// search by exact username
router.get("/search", registry.userController.searchByUsername);

export default router;
