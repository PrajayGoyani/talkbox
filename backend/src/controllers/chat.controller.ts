import { Request, Response, NextFunction } from "express";
import { chatService } from "../services/chat.service.js";

export const getChatListing = async (req: Request, res: Response) => {
  const chats = await chatService.getChatListing(req.user!.id);
  res.success(chats);
};

export const getChatRequests = async (req: Request, res: Response) => {
  const chats = await chatService.getChatRequests(req.user!.id);
  res.success(chats);
};


export const searchChats = async (req: Request, res: Response) => {
  const query = req.query.q || "";
  const chats = await chatService.searchChats(req.user!.id, query);
  res.success(chats);
};

export const requestChat = async (req: Request, res: Response) => {
  const chat = await chatService.requestChat(req.user!.id, req.body.username);
  res.success(chat);
};

export const acceptChat = async (req: Request, res: Response) => {
  const chat = await chatService.acceptChat(req.params.chatId, req.user!.id);
  res.success(chat);
};

export const rejectChat = async (req: Request, res: Response) => {
  const chat = await chatService.rejectChat(req.params.chatId, req.user!.id);
  res.success(chat);
};

export const deleteChat = async (req: Request, res: Response) => {
  const result = await chatService.deleteChat(req.params.chatId, req.user!.id);
  res.success(result);
};

export const getChatMessages = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const cursor = (req.query.cursor as string) || undefined;
  const messages = await chatService.getChatMessages(req.params.chatId, req.user!.id, limit, cursor as any);
  res.success(messages);
};

export const markChatRead = async (req: Request, res: Response) => {
  const result = await chatService.markChatRead(req.params.chatId, req.user!.id);
  res.success(result);
};

