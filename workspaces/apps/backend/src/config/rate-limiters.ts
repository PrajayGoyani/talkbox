import { RATE_LIMIT_AUTH_MAX } from "@config/env";
import { createRateLimiter } from "@middlewares/rate-limiter.middleware";

export const rateLimiters = {
  auth: createRateLimiter(RATE_LIMIT_AUTH_MAX, 60000, "auth"),
  authRefresh: createRateLimiter(30, 60000, "auth-refresh", "Too many token refresh requests. Please wait a moment."),
  email: createRateLimiter(
    1,
    60000,
    "email",
    "Verification email already sent! Please wait a minute before trying again.",
  ),
  passwordReset: createRateLimiter(
    1,
    60000,
    "password-reset",
    "Password reset email already sent! Please wait a minute before trying again.",
  ),
  logout: createRateLimiter(200, 60000, "logout", "Too many logout attempts. Please try again later."),
};
