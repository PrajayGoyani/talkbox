if (!process.env.ALLOWED_ORIGINS) {
  console.error("Fatal: ALLOWED_ORIGINS environment variable is required.");
  process.exit(1);
}

export const PORT = process.env.PORT || 5000;
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY as string;
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION as string;
export const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY as string;
export const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION as string;
export const MONGO_URI = process.env.MONGO_URI as string;
export const NODE_ENV = process.env.NODE_ENV as string;
export const BCRYPT_SALT = Number(process.env.BCRYPT_SALT) || 12;
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
export const UPLOAD_STRATEGY = process.env.UPLOAD_STRATEGY as string;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME as string;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY as string;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET as string;
export const ENABLE_JOBS = process.env.ENABLE_JOBS === "true";
export const DEBUG_JOBS = process.env.DEBUG_JOBS === "true";
