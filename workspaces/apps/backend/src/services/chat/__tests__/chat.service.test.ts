import { FREE_PLAN_CHAT_LIMIT, FREE_PLAN_SCRUB_DAYS } from "@config/env";
import Chat from "@models/chat.model";
import Message from "@models/message.model";
import Notification from "@models/notification.model";
import User from "@models/user.model";
import { ChatService } from "@services/chat/chat.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");
vi.mock("@models/notification.model");

const SENDER_ID = "507f191e810c19729de860ea";
const TARGET_ID = "507f1f77bcf86cd799439011";

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

  it("should delegate requestChat to chatActionService", async () => {
    await chatService.requestChat("u1", "target");
    expect(chatActionService.requestChat).toHaveBeenCalledWith("u1", "target");
  });

  it("should delegate getChatMessages to messageService", async () => {
    await chatService.getChatMessages("chat1", "u1", 20, "c1", "pro", true);
    expect(messageService.getChatMessages).toHaveBeenCalledWith("chat1", "u1", 20, "c1", "pro", true);
  });

  it("should delegate markChatRead to messageService", async () => {
    await chatService.markChatRead("chat1", "u1");
    expect(messageService.markChatRead).toHaveBeenCalledWith("chat1", "u1");
  });
});
