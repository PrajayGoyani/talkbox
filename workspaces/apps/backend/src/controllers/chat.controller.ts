import { AcceptChatRequest, RejectChatRequest } from "@controllers/types";
import { chatService } from "@services/chat.service";
import { Request, Response } from "express";

export const getChatListing = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 20;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const result = await chatService.getChatListing(req.user!.id, limit, cursor);
  res.success(result);
};

export const getChatRequests = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 20;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const result = await chatService.getChatRequests(req.user!.id, limit, cursor);
  res.success(result);
};

export const searchChats = async (req: Request, res: Response) => {
  const query = (req.query.q || "") as string;
  if (!query) {
    return res.success({ data: [], nextCursor: null, hasMore: false });
  }
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 20;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const result = await chatService.searchChats(req.user!.id, query, limit, cursor);
  res.success(result);
};

export const requestChat = async (req: Request, res: Response) => {
  const chat = await chatService.requestChat(req.user!.id, req.body.username);
  res.success(chat);
};

export const acceptChat = async (req: AcceptChatRequest, res: Response) => {
  const chat = await chatService.acceptChat(req.params.chatId, req.user!.id);
  res.success(chat);
};

export const rejectChat = async (req: RejectChatRequest, res: Response) => {
  const chat = await chatService.rejectChat(req.params.chatId as string, req.user!.id);
  res.success(chat);
};

export const deleteChat = async (req: Request, res: Response) => {
  const result = await chatService.deleteChat(req.params.chatId as string, req.user!.id);
  res.success(result);
};

export const getChatMessages = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 50;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const markAsRead = req.query.read === "true";
  const messages = await chatService.getChatMessages(
    req.params.chatId as string,
    req.user!.id,
    limit,
    cursor,
    req.user!.plan,
    markAsRead,
  );
  res.success(messages);
};

export const markChatRead = async (req: Request, res: Response) => {
  const result = await chatService.markChatRead(req.params.chatId as string, req.user!.id);
  res.success(result);
};
