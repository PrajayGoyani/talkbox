import { registry } from "@bootstrap/registry";
import { authenticateToken } from "@middlewares/auth.middleware";
import { redisGuardService } from "@services/infra/redis.service";
import { verifyAccessToken } from "@utils/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFn = <T extends (...args: any[]) => any>(fn: any) =>
  fn as unknown as {
    mockImplementation: (impl: any) => void;
    mockReturnValue: (value: any) => void;
    mockResolvedValue: (value: any) => void;
    mockRejectedValue: (value: any) => void;
  };

vi.mock("@utils/jwt", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/jwt")>();
  return {
    ...actual,
    verifyAccessToken: vi.fn(),
  };
});

vi.mock("@bootstrap/registry", () => ({
  registry: {
    userCacheService: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock("@services/infra/redis.service", () => ({
  redisGuardService: {
    isTokenBlacklisted: vi.fn(),
  },
}));

describe("AuthMiddleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFn(registry.userCacheService.getUser).mockImplementation(
      async (id: string) => ({ id, username: "testuser" }) as any,
    );

    req = {
      headers: {},
      cookies: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it("should authenticate via Authorization header", async () => {
    req.headers.authorization = "Bearer valid-token";
    mockFn(verifyAccessToken).mockReturnValue({ id: "user123" } as any);

    await authenticateToken(req, res, next);

    expect(verifyAccessToken).toHaveBeenCalledWith("valid-token");
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("user123");
    expect(next).toHaveBeenCalled();
  });

  it("should authenticate via access_token cookie if header is missing", async () => {
    req.cookies.access_token = "cookie-token";
    mockFn(verifyAccessToken).mockReturnValue({ id: "user456" } as any);

    await authenticateToken(req, res, next);

    expect(verifyAccessToken).toHaveBeenCalledWith("cookie-token");
    expect(req.user.id).toBe("user456");
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if no token is provided", async () => {
    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("No token provided") }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if token is invalid", async () => {
    req.headers.authorization = "Bearer invalid-token";
    mockFn(verifyAccessToken).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is blacklisted (logged out)", async () => {
    req.headers.authorization = "Bearer valid-token";
    mockFn(redisGuardService.isTokenBlacklisted).mockResolvedValue(true);

    await authenticateToken(req, res, next);

    expect(redisGuardService.isTokenBlacklisted).toHaveBeenCalledWith("valid-token");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("revoked") }));
    expect(next).not.toHaveBeenCalled();
  });

  it("should authenticate successfully if token is not blacklisted", async () => {
    req.headers.authorization = "Bearer valid-token";
    mockFn(redisGuardService.isTokenBlacklisted).mockResolvedValue(false);
    mockFn(verifyAccessToken).mockReturnValue({ id: "user123" } as any);

    await authenticateToken(req, res, next);

    expect(redisGuardService.isTokenBlacklisted).toHaveBeenCalledWith("valid-token");
    expect(verifyAccessToken).toHaveBeenCalledWith("valid-token");
    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
