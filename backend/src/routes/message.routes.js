import express from "express";
const router = express.Router();

import User from "../models/user.model.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";

import { validate } from "../utils/validation.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

router.use(authenticateToken);

router.get("/:chatId", async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  const messages = await Message.find({ chat: chat._id });
  res.json(messages);
});

// Note: willing to manage socket for this
router.post("/", validate(authenticateToken), async (req, res) => {
  // Implementation will go here
  res.send("Create message route");
});

// Note: should we give delete option in chat?
router.delete("/:id", validate(authenticateToken), async (req, res) => {
  // Implementation will go here
  res.send(`Delete message with ID: ${req.params.id}`);
});

export default router;
