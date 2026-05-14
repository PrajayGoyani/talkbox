import { ChatController } from "@controllers/chat.controller";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ChatController", () => {
  let req: any;
  let res: any;
  let chatController: ChatController;
  let chatService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chatService = {
      getChatMessages: vi.fn(),
      markChatRead: vi.fn(),
    };
    chatController = new ChatController(chatService);
    req = {
      params: { chatId: "chat123" },
      query: {},
      headers: {},
      user: { id: "user123", plan: "free" },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      success: vi.fn().mockReturnThis(),
    };
  });

  describe("getChatMessages", () => {
    it("should call chatService.getChatMessages with correct params", async () => {
      req.query.limit = "30";
      req.query.cursor = "msg-456";
      const mockMessages = [{ id: "msg1" }];
      chatService.getChatMessages.mockResolvedValue(mockMessages as any);

      await chatController.getChatMessages(req, res);

      expect(chatService.getChatMessages).toHaveBeenCalledWith("chat123", "user123", 30, "msg-456", "free", false);
      expect(res.success).toHaveBeenCalledWith(mockMessages);
    });

    it("should use defaults if limit/cursor are missing", async () => {
      chatService.getChatMessages.mockResolvedValue([]);
      await chatController.getChatMessages(req, res);
      expect(chatService.getChatMessages).toHaveBeenCalledWith("chat123", "user123", 50, null, "free", false);
    });

    it("should prioritize headers for limit/cursor if query is missing", async () => {
      req.headers = { "x-limit": "10", "x-cursor": "msg-789" };
      chatService.getChatMessages.mockResolvedValue([]);
      await chatController.getChatMessages(req, res);
      expect(chatService.getChatMessages).toHaveBeenCalledWith("chat123", "user123", 10, "msg-789", "free", false);
    });
  });

  describe("markChatRead", () => {
    it("should call chatService.markChatRead", async () => {
      const mockResult = { message: "success" };
      chatService.markChatRead.mockResolvedValue(mockResult);

      await chatController.markChatRead(req, res);

      expect(chatService.markChatRead).toHaveBeenCalledWith("chat123", "user123");
      expect(res.success).toHaveBeenCalledWith(mockResult);
    });
  });
});
