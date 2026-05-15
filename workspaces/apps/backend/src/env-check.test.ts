import { describe, it, expect } from "vitest";

describe("Environment Verification", () => {
  it("should have Bun runtime defined", () => {
    expect(globalThis.Bun).toBeDefined();
    expect(Bun).toBeDefined();
    expect(Bun.env).toBeDefined();
  });

  it("should load @config/env with valid defaults", async () => {
    const env = await import("@config/env");
    expect(env).toBeDefined();

    // Verify numeric defaults are valid
    expect(env.DB_RETRY_ATTEMPTS).toBeGreaterThanOrEqual(1);
    expect(env.FREE_PLAN_CHAT_LIMIT).toBeGreaterThanOrEqual(1);
    expect(env.PRO_PLAN_SESSION_LIMIT).toBeGreaterThanOrEqual(1);
    expect(env.RETENTION_MESSAGE_DAYS).toBeGreaterThanOrEqual(1);
    expect(env.RATE_LIMIT_DEFAULT_MAX).toBeGreaterThanOrEqual(1);

    // Verify string defaults are well-formed
    expect(env.APP_NAME).toBeTruthy();
    expect(env.FRONTEND_URL).toMatch(/^https?:\/\//);
    expect(env.ALLOWED_ORIGINS).toBeInstanceOf(Array);

    // Verify cookie config has valid values
    expect(["strict", "lax", "none"]).toContain(env.COOKIE_SAMESITE);

    // Verify mode-sensitive configs
    expect(env.NODE_ENV).toBe("test");
    expect(env.COOKIE_SECURE).toBe(false); // test env
  });
});
