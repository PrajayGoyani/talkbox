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
    res = {};
    next = vi.fn();
  });

  it("should allow request if under limit", async () => {
    vi.mocked(redisService.incrementAndCheckLimit).mockResolvedValue(true);

    const middleware = createRateLimiter(5, 60000, "test");
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalledWith(expect.any(Object));
  });

  it("should block request and trigger L1 local block if over limit", async () => {
    vi.mocked(redisService.incrementAndCheckLimit).mockResolvedValue(false);

    const middleware = createRateLimiter(5, 60000, "test");

    // First call: hits Redis, gets blocked
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));

    // Second call: should hit L1 cache and NOT call Redis
    next.mockClear();
    vi.mocked(redisService.incrementAndCheckLimit).mockClear();

    await middleware(req as Request, res as Response, next);
    expect(redisService.incrementAndCheckLimit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("(L1)"),
      }),
    );
  });

  it("should enforce local limit even when Redis is connected (Fail-through protection)", async () => {
    (redisService as any).isConnected = true;
    vi.mocked(redisService.incrementAndCheckLimit).mockResolvedValue(true); // Redis says OK

    const middleware = createRateLimiter(2, 60000, "test-failthrough");

    // 1st request -> Local 1, Redis hit
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();

    // 2nd request -> Local 2, Redis hit
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();

    // 3rd request -> Local 3 (Over Local Limit)
    // Should block LOCALLY even if Redis is slow or would have allowed it
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
