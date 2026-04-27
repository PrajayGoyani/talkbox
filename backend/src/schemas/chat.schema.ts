import { USERNAME_ERROR, USERNAME_REGEX } from "@utils/validation";
import { z } from "zod";

export const chatRequestSchema = z.object({
  username: z
    .string()
    .transform((val) => (val.startsWith("@") ? val.slice(1) : val))
    .refine((val) => USERNAME_REGEX.test(val), USERNAME_ERROR),
});

export const chatSearchSchema = z.object({
  q: z
    .string()
    .optional()
    .default("")
    .transform((val) => {
      const trimmed = val.trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return escaped.startsWith("@") ? escaped.slice(1) : escaped;
    }),
});
