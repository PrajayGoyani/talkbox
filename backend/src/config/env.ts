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
export const REDIS_URL = process.env.REDIS_URL as string;
export const NODE_ENV = process.env.NODE_ENV as string;
export const SENTRY_DSN = process.env.SENTRY_DSN as string;
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

// Rate Limits
export const RATE_LIMIT_DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_DEFAULT_WINDOW_MS) || 60 * 1000;
export const RATE_LIMIT_DEFAULT_MAX = Number(process.env.RATE_LIMIT_DEFAULT_MAX) || 100;
export const RATE_LIMIT_AUTH_MAX = Number(process.env.RATE_LIMIT_AUTH_MAX) || 10;
export const RATE_LIMIT_SOCKET_MESSAGE_MAX = Number(process.env.RATE_LIMIT_SOCKET_MESSAGE_MAX) || 20;

// Cookie Configuration Overrides
export const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || (NODE_ENV === "production" ? "none" : "lax");
export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true" || NODE_ENV === "production";

// Email / SMTP (optional — graceful no-op if not configured)
export const SMTP_HOST = process.env.SMTP_HOST as string;
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
export const SMTP_USER = process.env.SMTP_USER as string;
export const SMTP_PASS = process.env.SMTP_PASS as string;
export const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@talkbox.app";
export const APP_NAME = process.env.APP_NAME || "Talkbox";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
export const RESET_TOKEN_TTL = Number(process.env.RESET_TOKEN_TTL) || 3600; // 1 hour
export const VERIFY_TOKEN_TTL = Number(process.env.VERIFY_TOKEN_TTL) || 86400; // 24 hours
