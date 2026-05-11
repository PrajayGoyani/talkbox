import { userService } from "@services/auth/user.service";
import { imageService } from "@services/infra/image.service";
import { AppError } from "@utils/AppError";
import { v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
}

export const uploadAvatar = async (req: Request, res: Response) => {
  if (!req.file) {
    throw AppError.badRequest("No file uploaded", "NO_FILE");
  }

  const isCloudinary = process.env.UPLOAD_STRATEGY === "cloudinary";
  let avatarPath: string;

  if (isCloudinary) {
    const processedBuffer = await imageService.getProcessedBuffer(req.file.buffer);

    const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "talkbox-avatars",
          format: "webp",
          public_id: `avatar-${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        },
      );
      uploadStream.end(processedBuffer);
    });
    avatarPath = uploadResult.secure_url;
  } else {
    const filename = await imageService.processAndSaveAvatar(req.file.buffer);
    avatarPath = `/uploads/${filename}`;
  }

  const result = await userService.uploadAvatar(req.user!.id, avatarPath);
  res.success(result);
};

export const updateProfile = async (req: Request, res: Response) => {
  const result = await userService.updateProfile(req.user!.id, req.body);
  res.success(result);
};

export const searchByUsername = async (req: Request, res: Response) => {
  const user = await userService.searchByUsername(req.query.username as string);
  res.success(user);
};
