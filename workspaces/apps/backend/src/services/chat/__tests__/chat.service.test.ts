import { ChatService } from "@services/chat/chat.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ChatService Delegation", () => {
  let chatService: ChatService;
  let chatListingService: any;
  let chatActionService: any;
  let messageService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    chatListingService = {
      getChatListing: vi.fn(),
      getChat: vi.fn(),
      getChatRequests: vi.fn(),
      searchChats: vi.fn(),
    };
    chatActionService = {
      requestChat: vi.fn(),
      acceptChat: vi.fn(),
      rejectChat: vi.fn(),
      deleteChat: vi.fn(),
      updateRetentionPeriod: vi.fn(),
    };
    messageService = {
      getChatMessages: vi.fn(),
      markChatRead: vi.fn(),
    };

    chatService = new ChatService(chatListingService, chatActionService, messageService);
  });

  it("should delegate getChatListing to chatListingService", async () => {
    await chatService.getChatListing("u1", 10, "c1");
    expect(chatListingService.getChatListing).toHaveBeenCalledWith("u1", 10, "c1");
  });

  it("should delegate getChatRequests to chatListingService", async () => {
    await chatService.getChatRequests("u1", 20, "c2");
    expect(chatListingService.getChatRequests).toHaveBeenCalledWith("u1", 20, "c2");
  });

  it("should delegate searchChats to chatListingService", async () => {
    await chatService.searchChats("u1", "query", 10, "c1");
    expect(chatListingService.searchChats).toHaveBeenCalledWith("u1", "query", 10, "c1");
  });

  it("should delegate getChat to chatListingService", async () => {
    await chatService.getChat("u1", "chat1");
    expect(chatListingService.getChat).toHaveBeenCalledWith("u1", "chat1");
  });

  it("should delegate requestChat to chatActionService", async () => {
    await chatService.requestChat("u1", "target");
    expect(chatActionService.requestChat).toHaveBeenCalledWith("u1", "target");
  });

  it("should delegate acceptChat to chatActionService", async () => {
    await chatService.acceptChat("chat1", "u1");
    expect(chatActionService.acceptChat).toHaveBeenCalledWith("chat1", "u1");
  });

  it("should delegate rejectChat to chatActionService", async () => {
    await chatService.rejectChat("chat1", "u1");
    expect(chatActionService.rejectChat).toHaveBeenCalledWith("chat1", "u1");
  });

  it("should delegate deleteChat to chatActionService", async () => {
    await chatService.deleteChat("chat1", "u1");
    expect(chatActionService.deleteChat).toHaveBeenCalledWith("chat1", "u1");
  });

  it("should delegate getChatMessages to messageService", async () => {
    await chatService.getChatMessages("chat1", "u1", 20, "c1", "pro", true);
    expect(messageService.getChatMessages).toHaveBeenCalledWith("chat1", "u1", 20, "c1", "pro", true);
  });

  it("should delegate markChatRead to messageService", async () => {
    await chatService.markChatRead("chat1", "u1");
    expect(messageService.markChatRead).toHaveBeenCalledWith("chat1", "u1");
  });

  it("should delegate updateRetentionPeriod to chatActionService and fetch updated chat", async () => {
    chatActionService.updateRetentionPeriod.mockResolvedValue({ id: "chat1" });
    chatListingService.getChat.mockResolvedValue({ id: "chat1", retentionPeriod: 6 });

    const result = await chatService.updateRetentionPeriod("chat1", "u1", 6);
    expect(chatActionService.updateRetentionPeriod).toHaveBeenCalledWith("chat1", "u1", 6);
    expect(chatListingService.getChat).toHaveBeenCalledWith("u1", "chat1");
    expect(result).toEqual({ id: "chat1", retentionPeriod: 6 });
  });

  it("should forward errors from underlying services", async () => {
    chatListingService.getChatListing.mockRejectedValue(new Error("Service error"));
    await expect(chatService.getChatListing("u1", 10, null)).rejects.toThrow("Service error");

    chatActionService.requestChat.mockRejectedValue(new Error("Action error"));
    await expect(chatService.requestChat("u1", "target")).rejects.toThrow("Action error");

    messageService.getChatMessages.mockRejectedValue(new Error("Message error"));
    await expect(chatService.getChatMessages("chat1", "u1")).rejects.toThrow("Message error");
  });
});
