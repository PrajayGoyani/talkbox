import { beforeEach, describe, expect, it, vi } from "vitest";
import Chat from "@models/chat.model";
import { chatLockdownService } from "../chat-lockdown.service";
import { redisService } from "@services/redis.service";

vi.mock("@models/chat.model");
vi.mock("@services/redis.service", () => ({
  redisService: {
    client: {
      publish: vi.fn().mockResolvedValue(null),
    },
    subClient: {
      subscribe: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
    },
    isConnected: true,
  },
}));

describe("ChatLockdownService Distributed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatLockdownService.deletedChats.clear();
  });

  it("should initialize Redis subscription and register listener", async () => {
    await chatLockdownService.init();

    expect(redisService.subClient?.subscribe).toHaveBeenCalledWith("chat:lockdown");
    expect(redisService.subClient?.on).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("should publish a lock event to Redis when a chat is locked locally", async () => {
    const chatId = "chat123";
    await chatLockdownService.lockdownChat(chatId);

    expect(chatLockdownService.isChatDeleted(chatId)).toBe(true);
    expect(redisService.client?.publish).toHaveBeenCalledWith(
      "chat:lockdown",
      JSON.stringify({ action: "lock", chatId: "chat123" })
    );
  });

  it("should NOT publish to Redis if isLocalOnly is true", async () => {
    const chatId = "chatLocal";
    await chatLockdownService.lockdownChat(chatId, true);

    expect(chatLockdownService.isChatDeleted(chatId)).toBe(true);
    expect(redisService.client?.publish).not.toHaveBeenCalled();
  });

  it("should publish an unlock event to Redis when a chat is unlocked locally", async () => {
    const chatId = "chat123";
    chatLockdownService.deletedChats.add(chatId);

    await chatLockdownService.unlockChat(chatId);

    expect(chatLockdownService.isChatDeleted(chatId)).toBe(false);
    expect(redisService.client?.publish).toHaveBeenCalledWith(
      "chat:lockdown",
      JSON.stringify({ action: "unlock", chatId: "chat123" })
    );
  });

  it("should update local Set when receiving a lock message from Redis", async () => {
    let messageHandler: Function = () => {};
    vi.mocked(redisService.subClient?.on).mockImplementation((event: string, handler: Function) => {
      if (event === "message") messageHandler = handler;
      return null as any;
    });

    await chatLockdownService.init();

    // Simulate incoming Redis message
    messageHandler("chat:lockdown", JSON.stringify({ action: "lock", chatId: "chatRemote" }));

    expect(chatLockdownService.isChatDeleted("chatRemote")).toBe(true);
  });

  it("should remove from local Set when receiving an unlock message from Redis", async () => {
    let messageHandler: Function = () => {};
    vi.mocked(redisService.subClient?.on).mockImplementation((event: string, handler: Function) => {
      if (event === "message") messageHandler = handler;
      return null as any;
    });

    await chatLockdownService.init();
    chatLockdownService.deletedChats.add("chatRemote");

    // Simulate incoming Redis message
    messageHandler("chat:lockdown", JSON.stringify({ action: "unlock", chatId: "chatRemote" }));

    expect(chatLockdownService.isChatDeleted("chatRemote")).toBe(false);
  });
});
