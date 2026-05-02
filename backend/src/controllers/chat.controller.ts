import { AcceptChatRequest, RejectChatRequest } from "@controllers/types";
import { chatService } from "@services/chat.service";
import { sendSuccess } from "@utils/response";
import { Request, Response } from "express";

export const getChatListing = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 20;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const result = await chatService.getChatListing(req.user!.id, limit, cursor);
  sendSuccess(res, result);
};

export const getChatRequests = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 20;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const result = await chatService.getChatRequests(req.user!.id, limit, cursor);
  sendSuccess(res, result);
};

export const searchChats = async (req: Request, res: Response) => {
  const query = (req.query.q || "") as string;
  if (!query) {
    return sendSuccess(res, { data: [], nextCursor: null, hasMore: false });
  }
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 20;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const result = await chatService.searchChats(req.user!.id, query, limit, cursor);
  sendSuccess(res, result);
};

export const requestChat = async (req: Request, res: Response) => {
  const chat = await chatService.requestChat(req.user!.id, req.body.username);
  sendSuccess(res, chat);
};

export const acceptChat = async (req: AcceptChatRequest, res: Response) => {
  const chat = await chatService.acceptChat(req.params.chatId, req.user!.id);
  sendSuccess(res, chat);
};

export const rejectChat = async (req: RejectChatRequest, res: Response) => {
  const chat = await chatService.rejectChat(req.params.chatId as string, req.user!.id);
  sendSuccess(res, chat);
};

export const deleteChat = async (req: Request, res: Response) => {
  const result = await chatService.deleteChat(req.params.chatId as string, req.user!.id);
  sendSuccess(res, result);
};

export const getChatMessages = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || req.headers["x-limit"]) as string) || 50;
  const cursor = ((req.query.cursor || req.headers["x-cursor"]) as string) || null;
  const messages = await chatService.getChatMessages(
    req.params.chatId as string,
    req.user!.id,
    limit,
    cursor,
    req.user!.plan,
  );
  sendSuccess(res, messages);
};

export const markChatRead = async (req: Request, res: Response) => {
  const result = await chatService.markChatRead(req.params.chatId as string, req.user!.id);
  sendSuccess(res, result);
};
