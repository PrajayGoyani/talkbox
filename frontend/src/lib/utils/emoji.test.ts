import { describe, it, expect } from "vitest";

import { parseMessageContent, getEmojiDisplayMode } from "./emoji";

describe("emoji utility", () => {
  describe("parseMessageContent", () => {
    it("should parse plain text", () => {
      const result = parseMessageContent("Hello world");
      expect(result).toEqual([{ type: "text", content: "Hello world" }]);
    });

    it("should parse links", () => {
      const result = parseMessageContent("Check out https://google.com");
      expect(result).toEqual([
        { type: "text", content: "Check out " },
        { type: "link", content: "https://google.com", url: "https://google.com" },
      ]);
    });

    it("should parse code blocks", () => {
      const result = parseMessageContent("Use `npm install` for setup");
      expect(result).toEqual([
        { type: "text", content: "Use " },
        { type: "code", content: "npm install" },
        { type: "text", content: " for setup" },
      ]);
    });

    it("should parse emojis", () => {
      const result = parseMessageContent("Hello 👋");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: "text", content: "Hello " });
      expect(result[1]).toMatchObject({ type: "emoji", content: "👋" });
    });

    it("should handle mixed content", () => {
      const result = parseMessageContent("Check `code` at https://link.com 🚀");
      expect(result).toEqual([
        { type: "text", content: "Check " },
        { type: "code", content: "code" },
        { type: "text", content: " at " },
        { type: "link", content: "https://link.com", url: "https://link.com" },
        { type: "text", content: " " },
        { type: "emoji", content: "🚀", name: "emoji" },
      ]);
    });

    it("should avoid parsing links if richFormatting is false", () => {
      const result = parseMessageContent("https://google.com", {}, { richFormatting: false });
      expect(result).toEqual([{ type: "text", content: "https://google.com" }]);
    });
  });

  describe("getEmojiDisplayMode", () => {
    it("should return normal for text", () => {
      expect(getEmojiDisplayMode("Hello")).toBe("normal");
    });

    it("should return jumbo-1 for single emoji", () => {
      expect(getEmojiDisplayMode("🚀")).toBe("jumbo-1");
      expect(getEmojiDisplayMode("  🚀  ")).toBe("jumbo-1");
    });

    it("should return jumbo-2 for two emojis", () => {
      expect(getEmojiDisplayMode("🚀🔥")).toBe("jumbo-2");
      expect(getEmojiDisplayMode("🚀 🔥")).toBe("jumbo-2");
    });

    it("should return jumbo-3 for three emojis", () => {
      expect(getEmojiDisplayMode("🚀🔥✨")).toBe("jumbo-3");
    });

    it("should return normal for 4+ emojis", () => {
      expect(getEmojiDisplayMode("🚀🔥✨👀")).toBe("normal");
    });

    it("should return normal for mixed text and emoji", () => {
      expect(getEmojiDisplayMode("Hi 🚀")).toBe("normal");
    });
  });
});
