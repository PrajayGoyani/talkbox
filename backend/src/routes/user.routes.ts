import express from "express";
const router = express.Router();

import { searchByUsername, uploadAvatar, updateProfile } from "@controllers/user.controller";
import { authenticateToken } from "@middlewares/auth.middleware";
import { rateLimiter } from "@middlewares/rate-limiter.middleware";
import { upload, memoryUpload } from "@middlewares/upload.middleware";
import { validate } from "@middlewares/validate.middleware";
import { updateProfileSchema } from "@schemas/user.schema";

router.use(authenticateToken);
router.use(rateLimiter);

// Upload avatar
router.post("/avatar", memoryUpload.single("avatar"), uploadAvatar);

// Update user profile
router.patch("/profile", validate(updateProfileSchema), updateProfile);

// search by exact username
router.get("/search", searchByUsername);

export default router;
