import { ChatController } from "@controllers/chat.controller";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ChatController", () => {
  let req: any;
  let res: any;
  let next: any;
  let chatController: ChatController;
  let chatService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
    chatService = {
      getChatListing: vi.fn(),
      getChatRequests: vi.fn(),
      searchChats: vi.fn(),
      requestChat: vi.fn(),
      acceptChat: vi.fn(),
      rejectChat: vi.fn(),
      deleteChat: vi.fn(),
      getChatMessages: vi.fn(),
      markChatRead: vi.fn(),
      getChat: vi.fn(),
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

  describe("getChatListing", () => {
    it("should call chatService.getChatListing with defaults", async () => {
      const mockResult = { data: [], nextCursor: null, hasMore: false };
      chatService.getChatListing.mockResolvedValue(mockResult);

      await chatController.getChatListing(req, res);

      expect(chatService.getChatListing).toHaveBeenCalledWith("user123", 20, null);
      expect(res.success).toHaveBeenCalledWith(mockResult);
    });

    it("should read limit and cursor from query", async () => {
      req.query = { limit: "10", cursor: "cursor-abc" };
      await chatController.getChatListing(req, res);
      expect(chatService.getChatListing).toHaveBeenCalledWith("user123", 10, "cursor-abc");
    });

    it("should fallback to headers when query is missing", async () => {
      req.headers = { "x-limit": "5", "x-cursor": "header-cursor" };
      await chatController.getChatListing(req, res);
      expect(chatService.getChatListing).toHaveBeenCalledWith("user123", 5, "header-cursor");
    });
  });

  describe("getChatRequests", () => {
    it("should call chatService.getChatRequests with defaults", async () => {
      chatService.getChatRequests.mockResolvedValue({ data: [], nextCursor: null, hasMore: false });

      await chatController.getChatRequests(req, res);

      expect(chatService.getChatRequests).toHaveBeenCalledWith("user123", 20, null);
      expect(res.success).toHaveBeenCalled();
    });
  });

  describe("searchChats", () => {
    it("should call chatService.searchChats with query", async () => {
      req.query = { q: "test" };
      chatService.searchChats.mockResolvedValue({ data: [], nextCursor: null, hasMore: false });

      await chatController.searchChats(req, res);

      expect(chatService.searchChats).toHaveBeenCalledWith("user123", "test", 20, null);
      expect(res.success).toHaveBeenCalled();
    });

    it("should return empty result when query is empty", async () => {
      req.query = { q: "" };

      await chatController.searchChats(req, res);

      expect(chatService.searchChats).not.toHaveBeenCalled();
      expect(res.success).toHaveBeenCalledWith({ data: [], nextCursor: null, hasMore: false });
    });
  });

  describe("requestChat", () => {
    it("should call chatService.requestChat with username from body", async () => {
      req.body = { username: "targetUser" };
      chatService.requestChat.mockResolvedValue({ id: "chat1" });

      await chatController.requestChat(req, res);

      expect(chatService.requestChat).toHaveBeenCalledWith("user123", "targetUser");
      expect(res.success).toHaveBeenCalledWith({ id: "chat1" });
    });
  });

  describe("acceptChat", () => {
    it("should call chatService.acceptChat with chatId from params", async () => {
      chatService.acceptChat.mockResolvedValue({ id: "chat123", status: "accepted" });

      await chatController.acceptChat(req, res);

      expect(chatService.acceptChat).toHaveBeenCalledWith("chat123", "user123");
      expect(res.success).toHaveBeenCalledWith({ id: "chat123", status: "accepted" });
    });
  });

  describe("rejectChat", () => {
    it("should call chatService.rejectChat with chatId from params", async () => {
      chatService.rejectChat.mockResolvedValue({ id: "chat123", status: "rejected" });

      await chatController.rejectChat(req, res);

      expect(chatService.rejectChat).toHaveBeenCalledWith("chat123", "user123");
      expect(res.success).toHaveBeenCalledWith({ id: "chat123", status: "rejected" });
    });
  });

  describe("deleteChat", () => {
    it("should call chatService.deleteChat with chatId from params", async () => {
      chatService.deleteChat.mockResolvedValue({ message: "Chat successfully deleted" });

      await chatController.deleteChat(req, res);

      expect(chatService.deleteChat).toHaveBeenCalledWith("chat123", "user123");
      expect(res.success).toHaveBeenCalledWith({ message: "Chat successfully deleted" });
    });
  });

  describe("getChat", () => {
    it("should call chatService.getChat with chatId from params", async () => {
      chatService.getChat.mockResolvedValue({ id: "chat123" });

      await chatController.getChat(req, res);

      expect(chatService.getChat).toHaveBeenCalledWith("user123", "chat123");
      expect(res.success).toHaveBeenCalledWith({ id: "chat123" });
    });
  });

  describe("error forwarding", () => {
    it("should forward errors from getChatListing", async () => {
      chatService.getChatListing.mockRejectedValue(new Error("Listing error"));
      await expect(chatController.getChatListing(req, res)).rejects.toThrow("Listing error");
    });

    it("should forward errors from requestChat", async () => {
      req.body = { username: "targetUser" };
      chatService.requestChat.mockRejectedValue(new Error("Request error"));
      await expect(chatController.requestChat(req, res)).rejects.toThrow("Request error");
    });

    it("should forward errors from getChatMessages", async () => {
      chatService.getChatMessages.mockRejectedValue(new Error("Messages error"));
      await expect(chatController.getChatMessages(req, res)).rejects.toThrow("Messages error");
    });
  });
});
