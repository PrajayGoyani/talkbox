import { chatService } from '../services/chat.service.js';
import { success } from '../utils/response.js';

export const getChatListing = async (req, res) => {
    const chats = await chatService.getChatListing(req.user.id);
    res.json(chats);
};

export const createChat = async (req, res) => {
    // Note: the service implementation uses findOneAndUpdate to ensure idempotent behavior for simultaneous creations.
    const chat = await chatService.createOrGetChat(req.user.id, req.body.reciverId);
    res.status(201).json(success(chat));
};

export const updateChat = async (req, res) => {
    // NOTE: Not in scope right now, we have only one-to-one chat,
    // so no need to update chat, we can only update messages
    // TODO: Add logic to update chat
    const result = await chatService.updateChat(req.params.chatId, req.body);
    res.json(success(result));
};

export const deleteChat = async (req, res) => {
    // NOTE: should we implement soft delete?
    // or we also need to delete all messages related to this chat
    // TODO: Add logic to delete chat with chat messages
    const result = await chatService.deleteChat(req.params.chatId);
    res.json(success(result));
};

export const getChatMessages = async (req, res) => {
    // NOTE: Performance constraint says clients should load only recent 100 messages. 
    // Cursor based pagination
    // This getChatMessages might need pagination in the service, but let's keep it structurally same for now.
    const messages = await chatService.getChatMessages(req.params.chatId);
    res.json(messages);
};
