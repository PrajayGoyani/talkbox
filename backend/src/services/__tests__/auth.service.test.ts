import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@config/env", () => ({
  RESET_TOKEN_TTL: 3600,
  VERIFY_TOKEN_TTL: 86400,
}));

vi.mock("@services/redis.service", () => ({
  redisService: {
    storeToken: vi.fn(),
    getToken: vi.fn(),
    deleteToken: vi.fn(),
    publishCacheInvalidation: vi.fn(),
  },
}));

vi.mock("@services/email.service", () => ({
  emailService: {
    sendResetEmail: vi.fn(),
    sendVerificationEmail: vi.fn(),
  },
}));

vi.mock("@utils/jwt", () => ({
  generateTokens: vi.fn().mockReturnValue({
    accessToken: "test-access",
    refreshToken: "test-refresh",
  }),
  generateAccessToken: vi.fn().mockReturnValue("test-access"),
  verifyRefreshToken: vi.fn(),
}));

// Mock crypto for deterministic tokens
vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: () => "test-token-hex-64-chars-deterministic-mock-0000000000000000",
    }),
  },
}));

const mockUser = {
  _id: "user123",
  username: "testuser",
  name: "Test User",
  email: "test@example.com",
  password: "hashedpassword",
  avatarUrl: "/default.png",
  plan: "free" as const,
  subscriptionExpiresAt: null,
  isEmailVerified: false,
  toObject: () => ({
    _id: "user123",
    username: "testuser",
    name: "Test User",
    email: "test@example.com",
    plan: "free",
    subscriptionExpiresAt: null,
    isEmailVerified: false,
  }),
  comparePassword: vi.fn(),
  save: vi.fn(),
};

const mockUserModel: any = {
  findOne: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByEmailOrUsername: vi.fn(),
  exists: vi.fn(),
  create: vi.fn(),
};

// Create AuthService with mock model
import { AuthService } from "../auth.service";

const authService = new AuthService(mockUserModel);

// Import mocked dependencies
import { emailService } from "@services/email.service";
import { redisService } from "@services/redis.service";

describe("AuthService - Password Reset & Email Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── forgotPassword ────────────────────────────────────────────────

  describe("forgotPassword", () => {
    it("should generate token, store in Redis, and send email for existing user", async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await authService.forgotPassword("test@example.com");

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(redisService.storeToken).toHaveBeenCalledWith("reset", expect.any(String), "user123", 3600);
      expect(emailService.sendResetEmail).toHaveBeenCalledWith("test@example.com", expect.any(String));
    });

    it("should silently succeed for non-existent email (prevents enumeration)", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await authService.forgotPassword("nonexistent@example.com");

      expect(redisService.storeToken).not.toHaveBeenCalled();
      expect(emailService.sendResetEmail).not.toHaveBeenCalled();
      // No error thrown — this is the key security behavior
    });
  });

  // ─── resetPassword ─────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("should verify token, update password, and delete token", async () => {
      vi.mocked(redisService.getToken).mockResolvedValue("user123");
      mockUserModel.findById.mockResolvedValue({ ...mockUser, save: vi.fn() });

      await authService.resetPassword("valid-token", "newpassword123");

      expect(redisService.getToken).toHaveBeenCalledWith("reset", "valid-token");
      expect(redisService.deleteToken).toHaveBeenCalledWith("reset", "valid-token");
    });

    it("should throw for invalid/expired token", async () => {
      vi.mocked(redisService.getToken).mockResolvedValue(null);

      await expect(authService.resetPassword("expired-token", "newpass")).rejects.toThrow(
        "Invalid or expired reset token",
      );
    });

    it("should throw if user not found after token valid", async () => {
      vi.mocked(redisService.getToken).mockResolvedValue("user456");
      mockUserModel.findById.mockResolvedValue(null);

      await expect(authService.resetPassword("valid-token", "newpass")).rejects.toThrow();
    });
  });

  // ─── verifyEmail ───────────────────────────────────────────────────

  describe("verifyEmail", () => {
    it("should verify token, update user, and delete token", async () => {
      vi.mocked(redisService.getToken).mockResolvedValue("user123");
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await authService.verifyEmail("valid-verify-token");

      expect(redisService.getToken).toHaveBeenCalledWith("verify", "valid-verify-token");
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", { isEmailVerified: true });
      expect(redisService.deleteToken).toHaveBeenCalledWith("verify", "valid-verify-token");
    });

    it("should throw for expired verification token", async () => {
      vi.mocked(redisService.getToken).mockResolvedValue(null);

      await expect(authService.verifyEmail("expired-token")).rejects.toThrow("Invalid or expired verification token");
    });
  });

  // ─── resendVerificationEmail ───────────────────────────────────────

  describe("resendVerificationEmail", () => {
    it("should send verification email for unverified user", async () => {
      mockUserModel.findById.mockResolvedValue({ ...mockUser, isEmailVerified: false });

      await authService.resendVerificationEmail("user123");

      expect(redisService.storeToken).toHaveBeenCalledWith("verify", expect.any(String), "user123", 86400);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith("test@example.com", expect.any(String));
    });

    it("should throw if user already verified", async () => {
      mockUserModel.findById.mockResolvedValue({ ...mockUser, isEmailVerified: true });

      await expect(authService.resendVerificationEmail("user123")).rejects.toThrow("Email already verified");
    });

    it("should throw if user not found", async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(authService.resendVerificationEmail("nonexistent")).rejects.toThrow();
    });
  });

  // ─── sanitize ──────────────────────────────────────────────────────

  describe("sanitize", () => {
    it("should include isEmailVerified in sanitized output", () => {
      const result = authService.sanitize(mockUser as any);

      expect(result).toHaveProperty("isEmailVerified", false);
      expect(result).toHaveProperty("id", "user123");
      expect(result).toHaveProperty("email", "test@example.com");
    });

    it("should default isEmailVerified to false for legacy users", () => {
      const legacyUser = {
        ...mockUser,
        toObject: () => ({
          _id: "user123",
          username: "legacy",
          email: "legacy@test.com",
          plan: "free",
          subscriptionExpiresAt: null,
          // No isEmailVerified field
        }),
        avatarUrl: "/default.png",
      };

      const result = authService.sanitize(legacyUser as any);
      expect(result.isEmailVerified).toBe(false);
    });
  });
});
