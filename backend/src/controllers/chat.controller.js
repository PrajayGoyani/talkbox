import { chatService } from '../services/chat.service.js';
import { success } from '../utils/response.js';

export const getChatListing = async (req, res) => {
    const chats = await chatService.getChatListing(req.user.id);
    res.json(success(chats));
};

export const createChat = async (req, res) => {
    const chat = await chatService.createOrGetChat(req.user.id, req.body.reciverId);
    res.status(201).json(success(chat));
};

export const requestChat = async (req, res) => {
    const chat = await chatService.requestChat(req.user.id, req.body.username);
    res.status(201).json(success(chat));
};

export const acceptChat = async (req, res) => {
    const chat = await chatService.acceptChat(req.params.chatId, req.user.id);
    res.json(success(chat));
};

export const rejectChat = async (req, res) => {
    const chat = await chatService.rejectChat(req.params.chatId, req.user.id);
    res.json(success(chat));
};

export const updateChat = async (req, res) => {
    const result = await chatService.updateChat(req.params.chatId, req.body);
    res.json(success(result));
};

export const deleteChat = async (req, res) => {
    const result = await chatService.deleteChat(req.params.chatId);
    res.json(success(result));
};

export const getChatMessages = async (req, res) => {
    const messages = await chatService.getChatMessages(req.params.chatId);
    res.json(success(messages));
};

export const markChatRead = async (req, res) => {
    const result = await chatService.markChatRead(req.params.chatId, req.user.id);
    res.json(success(result));
};
