import { describe, it, expect } from "vitest";
import "@config/env"; // Try importing something that uses Bun

describe("Environment Verification", () => {
  it("should have Bun defined", () => {
    expect(globalThis.Bun).toBeDefined();
    expect(Bun).toBeDefined();
    expect(Bun.env).toBeDefined();
  });
});
