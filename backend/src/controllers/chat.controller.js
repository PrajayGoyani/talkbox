import { chatService } from "../services/chat.service.js";

export const getChatListing = async (req, res) => {
  const chats = await chatService.getChatListing(req.user.id);
  res.success(chats);
};

export const searchChats = async (req, res) => {
  const query = req.query.q || "";
  const chats = await chatService.searchChats(req.user.id, query);
  res.success(chats);
};

export const createChat = async (req, res) => {
  const chat = await chatService.createOrGetChat(req.user.id, req.body.reciverId);
  res.success(chat, 201);
};

export const requestChat = async (req, res) => {
  const chat = await chatService.requestChat(req.user.id, req.body.username);
  res.success(chat, 201);
};

export const acceptChat = async (req, res) => {
  const chat = await chatService.acceptChat(req.params.chatId, req.user.id);
  res.success(chat);
};

export const rejectChat = async (req, res) => {
  const chat = await chatService.rejectChat(req.params.chatId, req.user.id);
  res.success(chat);
};

export const updateChat = async (req, res) => {
  const result = await chatService.updateChat(req.params.chatId, req.body);
  res.success(result);
};

export const deleteChat = async (req, res) => {
  const result = await chatService.deleteChat(req.params.chatId);
  res.success(result);
};

export const getChatMessages = async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const cursor = req.query.cursor;
  const messages = await chatService.getChatMessages(req.params.chatId, limit, cursor);
  res.success(messages);
};

export const markChatRead = async (req, res) => {
  const result = await chatService.markChatRead(req.params.chatId, req.user.id);
  res.success(result);
};
