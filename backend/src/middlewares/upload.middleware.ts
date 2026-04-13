import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Cloudinary configuration (can use CLOUDINARY_URL or individual keys)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// S3 configuration
const s3Config: any = {
  region: process.env.AWS_REGION || "us-east-1",
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3 = new S3Client(s3Config);

const uploadDir = path.join(process.cwd(), "public", "uploads");

const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, "file-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const memoryStorage = multer.memoryStorage();

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    // @ts-ignore
    folder: "talkbox-uploads",
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
      return "file-" + uniqueSuffix;
    },
  },
});

const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET_NAME || "user-chat-uploads",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, `uploads/file-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const getStorageAdapter = () => {
  const strategy = process.env.UPLOAD_STRATEGY || "local";
  switch (strategy.toLowerCase()) {
    case "s3":
      return s3Storage;
    case "cloudinary":
      return cloudinaryStorage;
    case "local":
    default:
      return localStorage;
  }
};

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images, videos, audio, and standard documents (pdf, office, txt, zip)
  const allowedTypes = [
    "image/",
    "video/",
    "audio/",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
    "text/plain",
    "text/csv"
  ];
  
  const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type);
  
  if (!isAllowed) {
    return cb(new Error("File type not allowed!") as any, false);
  }
  
  cb(null, true);
};

// Global upload for general multi-strategy use
export const upload = multer({
  storage: getStorageAdapter(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
});

// Memory upload for Sharp processing (Local only)
export const memoryUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
});
