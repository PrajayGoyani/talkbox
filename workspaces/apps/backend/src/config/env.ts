if (!Bun.env.ALLOWED_ORIGINS) {
  console.warn("Warning: ALLOWED_ORIGINS environment variable is missing. Using default local origins.");
}

export const PORT = Bun.env.PORT || 5000;
export const JWT_SECRET_KEY = Bun.env.JWT_SECRET_KEY as string;
export const JWT_EXPIRATION = Bun.env.JWT_EXPIRATION as string;
export const JWT_REFRESH_SECRET_KEY = Bun.env.JWT_REFRESH_SECRET_KEY as string;
export const JWT_REFRESH_EXPIRATION = Bun.env.JWT_REFRESH_EXPIRATION as string;
export const MONGO_URI = Bun.env.MONGO_URI as string;
export const REDIS_URL = Bun.env.REDIS_URL as string;
export const NODE_ENV = Bun.env.NODE_ENV as string;
export const DB_RETRY_ATTEMPTS = Number(Bun.env.DB_RETRY_ATTEMPTS) || 5;
export const DB_RETRY_DELAY_MS = Number(Bun.env.DB_RETRY_DELAY_MS) || 1000;
export const SENTRY_DSN = Bun.env.SENTRY_DSN as string;
export const BASE_URL = Bun.env.BASE_URL || `http://localhost:${PORT}`;
export const UPLOAD_STRATEGY = Bun.env.UPLOAD_STRATEGY as string;
export const ALLOWED_ORIGINS = (Bun.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((o) => o.trim());
export const CLOUDINARY_CLOUD_NAME = Bun.env.CLOUDINARY_CLOUD_NAME as string;
export const CLOUDINARY_API_KEY = Bun.env.CLOUDINARY_API_KEY as string;
export const CLOUDINARY_API_SECRET = Bun.env.CLOUDINARY_API_SECRET as string;
export const ENABLE_JOBS = Bun.env.ENABLE_JOBS === "true";
export const DEBUG_JOBS = Bun.env.DEBUG_JOBS === "true";

// Feature Limits & Retention
export const REACTIONS_MAX_UNIQUE = Number(Bun.env.REACTIONS_MAX_UNIQUE) || 20;
export const FREE_PLAN_SCRUB_DAYS = Number(Bun.env.FREE_PLAN_SCRUB_DAYS) || 7;
export const FREE_PLAN_CHAT_LIMIT = Number(Bun.env.FREE_PLAN_CHAT_LIMIT) || 5;
export const PRO_PLAN_SESSION_LIMIT = Number(Bun.env.PRO_PLAN_SESSION_LIMIT) || 5;
export const RETENTION_MESSAGE_DAYS = Number(Bun.env.RETENTION_MESSAGE_DAYS) || 365;
export const RETENTION_DELETED_CHAT_DAYS = Number(Bun.env.RETENTION_DELETED_CHAT_DAYS) || 14;
export const RETENTION_NOTIFICATION_DAYS = Number(Bun.env.RETENTION_NOTIFICATION_DAYS) || 30;
export const RETENTION_CONCURRENCY = Number(Bun.env.RETENTION_CONCURRENCY) || 2;
export const RETENTION_BATCH_SIZE = Number(Bun.env.RETENTION_BATCH_SIZE) || 500;
export const USER_UPGRADE_CONCURRENCY = Number(Bun.env.USER_UPGRADE_CONCURRENCY) || 2;
export const USER_UPGRADE_BATCH_SIZE = Number(Bun.env.USER_UPGRADE_BATCH_SIZE) || 500;
export const SUBSCRIPTION_BATCH_SIZE = Number(Bun.env.SUBSCRIPTION_BATCH_SIZE) || 1000;
export const MESSAGE_MODIFY_LIMIT_HOURS = Number(Bun.env.MESSAGE_MODIFY_LIMIT_HOURS) || 1;

// Rate Limits
export const RATE_LIMIT_DEFAULT_WINDOW_MS = Number(Bun.env.RATE_LIMIT_DEFAULT_WINDOW_MS) || 60 * 1000;
export const RATE_LIMIT_DEFAULT_MAX = Number(Bun.env.RATE_LIMIT_DEFAULT_MAX) || 100;
export const RATE_LIMIT_AUTH_MAX = Number(Bun.env.RATE_LIMIT_AUTH_MAX) || 10;
export const RATE_LIMIT_SOCKET_MESSAGE_MAX = Number(Bun.env.RATE_LIMIT_SOCKET_MESSAGE_MAX) || 20;

// Cookie Configuration Overrides
export const COOKIE_SAMESITE: "strict" | "lax" | "none" =
  (Bun.env.COOKIE_SAMESITE as "strict" | "lax" | "none") || (NODE_ENV === "production" ? "none" : "lax");
export const COOKIE_SECURE = Bun.env.COOKIE_SECURE === "true" || NODE_ENV === "production";

// Email / SMTP (optional — graceful no-op if not configured)
export const RESEND_API_KEY = Bun.env.RESEND_API_KEY as string;
export const SMTP_HOST = Bun.env.SMTP_HOST as string;
export const SMTP_PORT = Number(Bun.env.SMTP_PORT) || 587;
export const SMTP_USER = Bun.env.SMTP_USER as string;
export const SMTP_PASS = Bun.env.SMTP_PASS as string;
export const EMAIL_FROM = Bun.env.EMAIL_FROM || "noreply@talkbox.app";
export const APP_NAME = Bun.env.APP_NAME || "Talkbox";
export const FRONTEND_URL = Bun.env.FRONTEND_URL || "http://localhost:5173";
export const RESET_TOKEN_TTL = Number(Bun.env.RESET_TOKEN_TTL) || 3600; // 1 hour
export const VERIFY_TOKEN_TTL = Number(Bun.env.VERIFY_TOKEN_TTL) || 86400; // 24 hours
