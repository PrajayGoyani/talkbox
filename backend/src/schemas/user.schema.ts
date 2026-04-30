import { USERNAME_ERROR, USERNAME_REGEX } from "@root/shared/constants/validation";
import { z } from "zod";

/**
 * Sanitize a display name:
 * - Trim whitespace
 * - Strip anything that's not a letter, space, hyphen, or apostrophe
 * - Capitalize first letter of each word
 */
const sanitizeName = (val) =>
  val
    .trim()
    .replace(/[^a-zA-Z\s\-']/g, "")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const nameField = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters")
  .transform(sanitizeName);

const noPadding = (val: string) => val === val.trim();
const PADDING_ERROR = "Leading and trailing spaces are not allowed";

export const signupSchema = z.object({
  username: z.string().trim().lowercase().regex(USERNAME_REGEX, USERNAME_ERROR),
  email: z.email().trim(),
  password: z.string().min(8).refine(noPadding, PADDING_ERROR),
  name: nameField.optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().lowercase().min(1, "Username is required"),
  password: z.string().min(1, "Password is required").refine(noPadding, PADDING_ERROR),
});

export const updateProfileSchema = z.object({
  name: nameField.optional(),
  bio: z.string().max(200, "Bio must be at most 200 characters").optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8),
});
