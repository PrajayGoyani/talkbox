import multer from "multer";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cloudinary configuration (can use CLOUDINARY_URL or individual keys)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
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

const useCloudinary = process.env.UPLOAD_STRATEGY === "cloudinary";

export const upload = multer({
  storage: useCloudinary ? cloudinaryStorage : localStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});
