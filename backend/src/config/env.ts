export const PORT = process.env.PORT || 5000;
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY as string;
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION as string;
export const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY as string;
export const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION as string;
export const MONGO_URI = process.env.MONGO_URI as string;
export const NODE_ENV = process.env.NODE_ENV as string;
export const BCRYPT_SALT = Number(process.env.BCRYPT_SALT) || 12;
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

if (!process.env.ALLOWED_ORIGINS) {
  console.error("Fatal: ALLOWED_ORIGINS environment variable is required.");
  process.exit(1);
}
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
