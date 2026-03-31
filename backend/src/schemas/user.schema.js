import { z } from 'zod';

export const signupSchema = z.object({
  username: z.string().refine(s => !s.includes(' '), 'Username cannot contain spaces.'),
  email: z.email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.email().nonempty(),
  password: z.string().nonempty(),
});
