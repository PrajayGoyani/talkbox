import { z } from "zod";

export const sendMessageSchema = z.object({
  chatId: z.string().min(1),
  receiverId: z.string().min(1),
  contentBody: z.string().min(1).max(5000),
  idempotencyKey: z.string().min(1),
});

export const reactMessageSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1),
  slug: z.string().optional(),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
});

export const editMessageSchema = z.object({
  messageId: z.string().min(1),
  contentBody: z.string().min(1).max(5000),
});

export const typingSchema = z.object({
  receiverId: z.string().min(1),
  chatId: z.string().min(1),
});

export const readChatSchema = z.object({
  chatId: z.string().min(1),
});

export const activeChatSchema = z.object({
  chatId: z.string().nullable(),
});

export type SendMessagePayload = z.infer<typeof sendMessageSchema>;
export type ReactMessagePayload = z.infer<typeof reactMessageSchema>;
export type DeleteMessagePayload = z.infer<typeof deleteMessageSchema>;
export type EditMessagePayload = z.infer<typeof editMessageSchema>;
export type TypingPayload = z.infer<typeof typingSchema>;
export type ReadChatPayload = z.infer<typeof readChatSchema>;
export type ActiveChatPayload = z.infer<typeof activeChatSchema>;
