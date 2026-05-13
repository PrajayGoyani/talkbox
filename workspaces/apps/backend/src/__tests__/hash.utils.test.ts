import { expect, test, describe } from "vitest";

import { generateETag, generateShortId, verifyIntegrity } from "../utils/hash.utils";

describe("Hash Utilities", () => {
  describe("generateETag", () => {
    test("should generate a consistent ETag for the same string", () => {
      const content = "Hello World";
      const etag1 = generateETag(content);
      const etag2 = generateETag(content);
      expect(etag1).toBe(etag2);
      expect(etag1).toMatch(/^W\/"[0-9a-f]+"$/);
    });

    test("should generate different ETags for different strings", () => {
      const etag1 = generateETag("Hello");
      const etag2 = generateETag("World");
      expect(etag1).not.toBe(etag2);
    });

    test("should handle Buffers", () => {
      const buffer = Buffer.from("Hello Buffer");
      const etag = generateETag(buffer);
      expect(etag).toMatch(/^W\/"[0-9a-f]+"$/);
    });
  });

  describe("generateShortId", () => {
    test("should generate a short base36 string", () => {
      const id = generateShortId("some-data");
      expect(id).toMatch(/^[0-9a-z]+$/);
    });

    test("should be consistent", () => {
      const data = "consistent-data";
      expect(generateShortId(data)).toBe(generateShortId(data));
    });
  });

  describe("verifyIntegrity", () => {
    test("should verify integrity correctly", () => {
      const data = "integrity-check";
      const hash = Bun.hash(data);

      expect(verifyIntegrity(data, hash.toString())).toBe(true);
      expect(verifyIntegrity(data, hash.toString(16))).toBe(true);
      expect(verifyIntegrity(data, "0x" + hash.toString(16))).toBe(true);
      expect(verifyIntegrity(data, hash)).toBe(true);
    });

    test("should fail for incorrect hash", () => {
      expect(verifyIntegrity("data", "wrong-hash")).toBe(false);
    });
  });
});
