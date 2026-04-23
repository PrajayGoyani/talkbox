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

// Feature Limits & Retention
export const REACTIONS_MAX_UNIQUE = Number(process.env.REACTIONS_MAX_UNIQUE) || 20;
export const FREE_PLAN_SCRUB_DAYS = Number(process.env.FREE_PLAN_SCRUB_DAYS) || 7;
export const FREE_PLAN_CHAT_LIMIT = Number(process.env.FREE_PLAN_CHAT_LIMIT) || 5;
export const PRO_PLAN_SESSION_LIMIT = Number(process.env.PRO_PLAN_SESSION_LIMIT) || 10;
export const RETENTION_MESSAGE_DAYS = Number(process.env.RETENTION_MESSAGE_DAYS) || 365;
export const RETENTION_DELETED_CHAT_DAYS = Number(process.env.RETENTION_DELETED_CHAT_DAYS) || 14;
export const RETENTION_NOTIFICATION_DAYS = Number(process.env.RETENTION_NOTIFICATION_DAYS) || 30;
export const MESSAGE_MODIFY_LIMIT_HOURS = Number(process.env.MESSAGE_MODIFY_LIMIT_HOURS) || 1;
