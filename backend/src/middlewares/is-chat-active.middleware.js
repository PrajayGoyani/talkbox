import { AppError } from "../utils/AppError.js";
import { chatLockdownService } from "../services/chat-lockdown.service.js";

export const isChatActive = (req, res, next) => {
  const chatId = req.params.chatId || req.body.chatId;

  if (!chatId) {
    return next();
  }

  if (chatLockdownService.isChatDeleted(chatId)) {
    return next(AppError.forbidden("This chat has been deleted and cannot accept new requests."));
  }

  next();
};
