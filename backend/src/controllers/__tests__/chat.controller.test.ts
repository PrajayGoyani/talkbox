import { getChatMessages, markChatRead } from "@controllers/chat.controller";
import { chatService } from "@services/chat.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@services/chat.service", () => ({
  chatService: {
    getChatMessages: vi.fn(),
    markChatRead: vi.fn(),
  },
}));

describe("ChatController", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
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
      vi.spyOn(chatService, "getChatMessages").mockResolvedValue(mockMessages as any);

      await getChatMessages(req, res);

      expect(chatService.getChatMessages).toHaveBeenCalledWith("chat123", "user123", 30, "msg-456", "free");
      expect(res.success).toHaveBeenCalledWith(mockMessages);
    });

    it("should use defaults if limit/cursor are missing", async () => {
      await getChatMessages(req, res);
      expect(vi.spyOn(chatService, "getChatMessages")).toHaveBeenCalledWith("chat123", "user123", 50, null, "free");
    });

    it("should prioritize headers for limit/cursor if query is missing", async () => {
      req.headers = { "x-limit": "10", "x-cursor": "msg-789" };
      await getChatMessages(req, res);
      expect(vi.spyOn(chatService, "getChatMessages")).toHaveBeenCalledWith("chat123", "user123", 10, "msg-789", "free");
    });
  });

  describe("markChatRead", () => {
    it("should call chatService.markChatRead", async () => {
      const mockResult = { message: "success" };
      vi.spyOn(chatService, "markChatRead").mockResolvedValue(mockResult);

      await markChatRead(req, res);

      expect(chatService.markChatRead).toHaveBeenCalledWith("chat123", "user123");
      expect(res.success).toHaveBeenCalledWith(mockResult);
    });
  });
});
