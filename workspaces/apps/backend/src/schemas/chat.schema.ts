import { USERNAME_ERROR, USERNAME_REGEX } from "shared/constants/validation";
import { z } from "zod";

export const chatRequestSchema = z.object({
  username: z
    .string()
    .transform((val) => (val.startsWith("@") ? val.slice(1) : val))
    .transform((val) => val.toLowerCase())
    .refine((val) => USERNAME_REGEX.test(val), USERNAME_ERROR),
});

export const chatSearchSchema = z.object({
  q: z
    .string()
    .optional()
    .default("")
    .transform((val) => {
      const trimmed = val.trim(); //.toLowerCase();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return escaped.startsWith("@") ? escaped.slice(1) : escaped;
    }),
});
