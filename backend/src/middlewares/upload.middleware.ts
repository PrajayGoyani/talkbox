import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, UPLOAD_STRATEGY } from "@config/env";

// Cloudinary configuration (can use CLOUDINARY_URL or individual keys)
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const uploadDir = path.join(process.cwd(), "public", "uploads");

const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const memoryStorage = multer.memoryStorage();

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    // @ts-ignore
    folder: "talkbox-avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
      return "avatar-" + uniqueSuffix;
    },
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

const useCloudinary = UPLOAD_STRATEGY === "cloudinary";

// Global upload for general multi-strategy use
export const upload = multer({
  storage: useCloudinary ? cloudinaryStorage : localStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// Memory upload for Sharp processing (Local only)
export const memoryUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});
