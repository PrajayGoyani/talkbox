import { z } from "zod";

export const createChatSchema = z.object({
  reciverId: z.string(),
});

export const chatRequestSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Username must be alphanumeric"),
});
