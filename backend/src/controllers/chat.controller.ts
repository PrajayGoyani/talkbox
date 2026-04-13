import { Request, Response } from "express";

import { chatService } from "../services/chat.service";
import { AppError } from "../utils/AppError";

export const getChatListing = async (req: Request, res: Response) => {
  const chats = await chatService.getChatListing(req.user!.id);
  res.success(chats);
};

export const getChatRequests = async (req: Request, res: Response) => {
  const chats = await chatService.getChatRequests(req.user!.id);
  res.success(chats);
};

export const searchChats = async (req: Request, res: Response) => {
  const query = (req.query.q || "") as string;
  const chats = await chatService.searchChats(req.user!.id, query);
  res.success(chats);
};

export const requestChat = async (req: Request, res: Response) => {
  const chat = await chatService.requestChat(req.user!.id, req.body.username);
  res.success(chat);
};

export const acceptChat = async (req: Request, res: Response) => {
  const chat = await chatService.acceptChat(req.params.chatId as string, req.user!.id);
  res.success(chat);
};

export const rejectChat = async (req: Request, res: Response) => {
  const chat = await chatService.rejectChat(req.params.chatId as string, req.user!.id);
  res.success(chat);
};

export const deleteChat = async (req: Request, res: Response) => {
  const result = await chatService.deleteChat(req.params.chatId as string, req.user!.id);
  res.success(result);
};

export const getChatMessages = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const cursor = (req.query.cursor as string) || undefined;
  const messages = await chatService.getChatMessages(req.params.chatId as string, req.user!.id, limit, cursor as any);
  res.success(messages);
};

export const markChatRead = async (req: Request, res: Response) => {
  const result = await chatService.markChatRead(req.params.chatId as string, req.user!.id);
  res.success(result);
};

export const uploadAttachment = async (req: Request, res: Response) => {
  if (!req.file) {
    throw AppError.badRequest("No file provided");
  }

  // We should verify if the user is part of the chat they are uploading to
  const chat = await chatService.Chat.findById(req.params.chatId);
  if (!chat || chat.isDeleted) {
    throw AppError.notFound("Chat not found", "CHAT_NOT_FOUND");
  }
  
  if (chat.status === "rejected") {
    throw AppError.forbidden("Cannot upload to a rejected chat");
  }

  const isParticipant =
    chat.userA.toString() === req.user!.id || chat.userB.toString() === req.user!.id;
  if (!isParticipant) {
    throw AppError.forbidden("You are not part of this chat");
  }

  const url = (req.file as any).path || (req.file as any).location;
  if (!url) {
    throw AppError.badRequest("Failed to retrieve file URL");
  }

  res.success({
    url,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
};
