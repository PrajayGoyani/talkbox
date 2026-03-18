import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().optional(),
  email: z.email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
