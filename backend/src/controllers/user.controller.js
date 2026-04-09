import { userService } from "../services/user.service.js";

export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  // Construct path based on storage strategy
  const isCloudinary = process.env.UPLOAD_STRATEGY === "cloudinary";
  const avatarPath = isCloudinary ? req.file.path : `/uploads/${req.file.filename}`;

  const result = await userService.uploadAvatar(req.user.id, avatarPath);
  res.success(result);
};

export const updateProfile = async (req, res) => {
  // TODO: Add logic to update user profile along with avatar image
  const result = await userService.updateProfile(req.user.id, req.body);
  res.success(result);
};

export const searchByUsername = async (req, res) => {
  const user = await userService.searchByUsername(req.query.username);
  res.success(user);
};
