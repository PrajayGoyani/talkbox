import { z } from 'zod';

export const createChatSchema = z.object({
  reciverId: z.string(),
});