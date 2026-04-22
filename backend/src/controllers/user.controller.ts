import { imageService } from "@services/image.service";
import { userService } from "@services/user.service";
import { v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";

export const uploadAvatar = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const isCloudinary = process.env.UPLOAD_STRATEGY === "cloudinary";
  let avatarPath;

  try {
    if (isCloudinary) {
      const processedBuffer = await imageService.getProcessedBuffer(req.file.buffer);

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "talkbox-avatars",
            format: "webp",
            public_id: `avatar-${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(processedBuffer);
      });
      avatarPath = (uploadResult as any).secure_url;
    } else {
      const filename = await imageService.processAndSaveAvatar(req.file.buffer);
      avatarPath = `/uploads/${filename}`;
    }

    const result = await userService.uploadAvatar(req.user!.id, avatarPath);
    res.success(result);
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ success: false, message: (error as Error).message || "Failed to upload avatar" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  // TODO: Add logic to update user profile along with avatar image
  const result = await userService.updateProfile(req.user!.id, req.body);
  res.success(result);
};

export const searchByUsername = async (req: Request, res: Response) => {
  const user = await userService.searchByUsername(req.query.username as string);
  res.success(user);
};
