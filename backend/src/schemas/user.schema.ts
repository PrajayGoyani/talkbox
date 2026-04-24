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
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const nameField = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters")
  .transform(sanitizeName);

export const signupSchema = z.object({
  username: z.string().refine((s) => !s.includes(" "), "Username cannot contain spaces."),
  email: z.email(),
  password: z.string().min(8),
  name: nameField.optional(),
});

export const loginSchema = z.object({
  username: z.string().nonempty(),
  password: z.string().nonempty(),
});

export const updateProfileSchema = z.object({
  name: nameField.optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8),
});
