import { FREE_PLAN_CHAT_LIMIT, FREE_PLAN_SCRUB_DAYS } from "@config/env";
import Chat from "@models/chat.model";
import Message from "@models/message.model";
import Notification from "@models/notification.model";
import User from "@models/user.model";
import { AppError } from "@utils/AppError";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { chatService } from "@services/chat.service";

vi.mock("@models/chat.model");
vi.mock("@models/message.model");
vi.mock("@models/user.model");
vi.mock("@models/notification.model");

const SENDER_ID = "507f191e810c19729de860ea";
const TARGET_ID = "507f1f77bcf86cd799439011";

describe("ChatService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestChat (Limits)", () => {
    it("should allow a Free user to request a chat if below limit", async () => {
      const targetUser = { _id: TARGET_ID, username: "target" };

      vi.mocked(User.findOne).mockResolvedValue(targetUser as any);
      vi.mocked(User.findById).mockResolvedValue({ _id: SENDER_ID, plan: "free" } as any);
      // Mock count of accepted chats
      vi.mocked(Chat.countDocuments).mockResolvedValue(FREE_PLAN_CHAT_LIMIT - 1);
      vi.mocked(Chat.findOne).mockResolvedValue(null);
      vi.mocked(Chat.create).mockResolvedValue({ _id: "chat123" } as any);
      vi.mocked(Notification.create).mockResolvedValue({ populate: vi.fn().mockResolvedValue({}) } as any);

      await chatService.requestChat(SENDER_ID, "target");

      expect(Chat.create).toHaveBeenCalled();
    });

    it("should throw error if Free user reached active chat limit", async () => {
      const targetUser = { _id: TARGET_ID, username: "target" };

      vi.mocked(User.findOne).mockResolvedValue(targetUser as any);
      vi.mocked(User.findById).mockResolvedValue({ _id: SENDER_ID, plan: "free" } as any);
      vi.mocked(Chat.countDocuments).mockResolvedValue(FREE_PLAN_CHAT_LIMIT);

      await expect(chatService.requestChat(SENDER_ID, "target")).rejects.toThrow(
        expect.objectContaining({ code: "CHAT_LIMIT_REACHED" }),
      );
    });

    it("should NOT enforce limit for Pro users", async () => {
      const targetUser = { _id: TARGET_ID, username: "target" };

      vi.mocked(User.findOne).mockResolvedValue(targetUser as any);
      vi.mocked(User.findById).mockResolvedValue({ _id: SENDER_ID, plan: "pro" } as any);
      // Even if count is high
      vi.mocked(Chat.countDocuments).mockResolvedValue(100);
      vi.mocked(Chat.findOne).mockResolvedValue(null);
      vi.mocked(Chat.create).mockResolvedValue({ _id: "chat123" } as any);
      vi.mocked(Notification.create).mockResolvedValue({ populate: vi.fn().mockResolvedValue({}) } as any);

      await chatService.requestChat(SENDER_ID, "target");

      expect(Chat.create).toHaveBeenCalled();
    });
  });

  describe("getChatMessages (Scrubbing)", () => {
    it("should scrub old messages for Free users", async () => {
      const chatId = "chat1";
      const userId = "free_user";

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - (FREE_PLAN_SCRUB_DAYS + 1));

      const recentDate = new Date();

      const mockMessages = [
        {
          _id: { toString: () => "507f191e810c19729de860ec" },
          chatId: { toString: () => chatId },
          senderId: { toString: () => userId },
          contentBody: "Hello",
          createdAt: recentDate,
          reactions: [],
          toObject: function () {
            return this;
          },
        },
        {
          _id: { toString: () => "507f191e810c19729de860ed" },
          chatId: { toString: () => chatId },
          senderId: { toString: () => userId },
          contentBody: "Old Secret",
          createdAt: oldDate,
          reactions: [],
          toObject: function () {
            return this;
          },
        },
      ];

      vi.mocked(Chat.findById).mockResolvedValue({
        _id: chatId,
        status: "accepted",
        participants: [userId, "other"],
      } as any);
      vi.mocked(Message.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockMessages as any),
      } as any);

      const result = await chatService.getChatMessages(chatId, userId, 50, null, "free");

      // Result is reversed in services, so m1 is index 1, m2 is index 0
      expect(result[1].contentBody).toBe("Hello");
      expect(result[1].isScrubbed).toBeUndefined();

      expect(result[0].contentBody).toBe("Message unavailable on Free plan.");
      expect(result[0].isScrubbed).toBe(true);
    });

    it("should NOT scrub old messages for Pro users", async () => {
      const chatId = "chat1";
      const userId = "pro_user";

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);

      const mockMessages = [
        {
          _id: { toString: () => "507f191e810c19729de860ee" },
          chatId: { toString: () => chatId },
          senderId: { toString: () => userId },
          contentBody: "Old Secret",
          createdAt: oldDate,
          reactions: [],
          toObject: function () {
            return this;
          },
        },
      ];

      vi.mocked(Chat.findById).mockResolvedValue({
        _id: chatId,
        status: "accepted",
        participants: [userId, "other"],
      } as any);
      vi.mocked(Message.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockMessages as any),
      } as any);

      const result = await chatService.getChatMessages(chatId, userId, 50, null, "pro");

      expect(result[0].contentBody).toBe("Old Secret");
      expect(result[0].isScrubbed).toBeUndefined();
    });
  });
});
