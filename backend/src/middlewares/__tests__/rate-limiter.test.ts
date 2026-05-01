import { createRateLimiter } from "@middlewares/rate-limiter.middleware";
import { redisService } from "@services/redis.service";
import { Request, Response } from "express";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

vi.mock("@services/redis.service", () => ({
  redisService: {
    incrementAndCheckLimit: vi.fn(),
    client: {},
    isConnected: true,
  },
}));

describe("RateLimiter Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { ip: "127.0.0.1", user: undefined };
    res = {
      set: vi.fn(),
    };
    next = vi.fn();
  });

  it("should allow request if under limit and set headers", async () => {
    vi.spyOn(redisService, "incrementAndCheckLimit").mockResolvedValue({
      allowed: true,
      current: 2,
      ttl: 55000,
    });

    const middleware = createRateLimiter(5, 60000, "test");
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Limit", "5");
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "3");
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
  });

  it("should block request and trigger L1 local block if over limit", async () => {
    vi.spyOn(redisService, "incrementAndCheckLimit").mockResolvedValue({
      allowed: false,
      current: 6,
      ttl: 50000,
    });

    const middleware = createRateLimiter(5, 60000, "test");

    // First call: hits Redis, gets blocked
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));

    // Second call: should hit L1 cache and NOT call Redis
    next.mockClear();
    vi.spyOn(redisService, "incrementAndCheckLimit").mockClear();

    await middleware(req as Request, res as Response, next);
    expect(vi.spyOn(redisService, "incrementAndCheckLimit")).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("(L1)"),
      }),
    );
  });

  it("should enforce local limit even when Redis is connected (Fail-through protection)", async () => {
    let redisCount = 0;
    vi.spyOn(redisService, "incrementAndCheckLimit").mockImplementation(async () => {
      redisCount++;
      return {
        allowed: redisCount <= 2,
        current: redisCount,
        ttl: 60000,
      };
    });

    const middleware = createRateLimiter(2, 60000, "test-failthrough");

    // 1st request -> Local 1
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();

    // 2nd request -> Local 2
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();

    // 3rd request -> Local 3 (Over Local Limit)
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("(Local)"),
      }),
    );
  });

  it("should use local fallback if Redis is disconnected", async () => {
    (redisService as any).isConnected = false;

    const middleware = createRateLimiter(2, 60000, "test-fallback");

    // 1st request
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();

    // 2nd request
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();

    // 3rd request (Over limit)
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("(Local)"),
      }),
    );
  });
});
