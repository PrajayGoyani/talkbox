export const PORT = process.env.PORT;
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION;
export const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY;
export const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION;
export const MONGO_URI = process.env.MONGO_URI;
export const NODE_ENV = process.env.NODE_ENV;
export const BCRYPT_SALT = Number(process.env.BCRYPT_SALT);
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
