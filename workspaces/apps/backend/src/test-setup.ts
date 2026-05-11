// Mock environment variables required by @config/env
process.env.ALLOWED_ORIGINS = "*";
process.env.JWT_SECRET_KEY = "test_secret";
process.env.JWT_REFRESH_SECRET_KEY = "test_refresh_secret";
process.env.MONGO_URI = "mongodb://localhost:27017/test";
process.env.NODE_ENV = "test";
process.env.JWT_EXPIRATION = "1h";
process.env.JWT_REFRESH_EXPIRATION = "7d";
process.env.UPLOAD_STRATEGY = "local";

/*
// Mute specific DeprecationWarnings (e.g. url.parse() from dependencies)
const originalEmit = process.emit;
// @ts-ignore
process.emit = function (name: string, data: any) {
  if (
    name === "warning" &&
    data &&
    data.name === "DeprecationWarning" &&
    data.message?.includes("url.parse")
  ) {
    return false;
  }
  // @ts-ignore
  return originalEmit.apply(process, arguments);
};
*/
