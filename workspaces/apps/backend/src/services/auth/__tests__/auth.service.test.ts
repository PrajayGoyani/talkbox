import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@config/env", () => ({
  RESET_TOKEN_TTL: 3600,
  VERIFY_TOKEN_TTL: 86400,
}));

vi.mock("@services/infra/redis.service", () => ({
  redisSessionService: {
    storeToken: vi.fn(),
    getToken: vi.fn(),
    deleteToken: vi.fn(),
  },
  redisPresenceService: {
    setUserOnline: vi.fn(),
    setUserOffline: vi.fn(),
  },
  redisGuardService: {
    incrementAndCheckLimit: vi.fn(),
    checkAndSetIdempotency: vi.fn(),
  },
  baseService: {
    isConnected: true,
    client: {},
    subClient: {},
  },
}));

vi.mock("@services/notification/email.service", () => ({
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

// Mock crypto.getRandomValues for deterministic tokens
vi.spyOn(crypto, "getRandomValues").mockImplementation((arr: any) => {
  arr.fill(0); // Mocked deterministic bytes
  return arr;
});

// Since we use Buffer.from(crypto.getRandomValues(...)).toString('hex') in AuthService,
// fill(0) will result in a string of '00' repeated.

const mockUser = {
  _id: new ObjectId("507f191e810c19729de860ea"),
  username: "testuser",
  name: "Test User",
  email: "test@example.com",
  password: "hashedpassword",
  avatarUrl: "/default.png",
  plan: "free" as const,
  subscriptionExpiresAt: null,
  isEmailVerified: false,
  toObject: function () {
    return {
      _id: this._id,
      username: this.username,
      name: this.name,
      email: this.email,
      plan: this.plan,
      subscriptionExpiresAt: this.subscriptionExpiresAt,
      isEmailVerified: this.isEmailVerified,
    };
  },
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

// Create AuthService with mock repository
import { UserRepository } from "@repositories/user.repository";
import { AuthService } from "@services/auth/auth.service";
import {
  redisSessionService,
  redisPresenceService,
  redisGuardService,
  baseService,
} from "@services/infra/redis.service";
import { AUTH_EVENTS, eventBus } from "@utils/event-bus";
import { verifyRefreshToken } from "@utils/jwt";

const mockUserRepository = new UserRepository(mockUserModel);
const authService = new AuthService(mockUserRepository);

describe("AuthService - Complete Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(eventBus, "emit").mockImplementation(() => true);
  });

  // ─── Signup ────────────────────────────────────────────────────────

  describe("signup", () => {
    it("should create user and return tokens", async () => {
      mockUserModel.exists.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);

      const result = await authService.signup({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

      expect(mockUserModel.exists).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(result.user.email).toBe("test@example.com");
      expect(result.accessToken).toBe("test-access");
      // Verification email is fired asynchronously
      expect(redisSessionService.storeToken).toHaveBeenCalledWith(
        "verify",
        expect.any(String),
        mockUser._id.toString(),
        expect.any(Number),
      );
    });

    it("should throw error if user already exists", async () => {
      mockUserModel.exists.mockResolvedValue({ _id: "exists" });

      await expect(
        authService.signup({
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        }),
      ).rejects.toThrow("User already exists");
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────

  describe("login", () => {
    it("should verify password and return tokens", async () => {
      mockUserModel.findByEmailOrUsername.mockResolvedValue(mockUser);
      (mockUser.comparePassword as any).mockResolvedValue(true);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await authService.login({
        username: "testuser",
        password: "password123",
      });

      expect(mockUserModel.findByEmailOrUsername).toHaveBeenCalledWith("testuser");
      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
      expect(result.accessToken).toBe("test-access");
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw for invalid credentials", async () => {
      mockUserModel.findByEmailOrUsername.mockResolvedValue(null);

      await expect(
        authService.login({
          username: "nonexistent",
          password: "password123",
        }),
      ).rejects.toThrow("Invalid credentials");
    });
  });

  // ─── Refresh ───────────────────────────────────────────────────────

  describe("refresh", () => {
    it("should generate new access token for valid refresh token", async () => {
      (verifyRefreshToken as any).mockReturnValue({ id: "user123" });
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await authService.refresh("valid-refresh-token");

      expect(verifyRefreshToken).toHaveBeenCalledWith("valid-refresh-token");
      expect(result.accessToken).toBe("test-access");
    });
  });

  // ─── Password Reset ────────────────────────────────────────────────

  describe("forgotPassword", () => {
    it("should generate token, store in Redis, and send email for existing user", async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await authService.forgotPassword("test@example.com");

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(redisSessionService.storeToken).toHaveBeenCalledWith(
        "reset",
        expect.any(String),
        mockUser._id.toString(),
        expect.any(Number),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(AUTH_EVENTS.PASSWORD_RESET_REQUESTED, {
        email: "test@example.com",
        token: expect.any(String),
      });
    });

    it("should silently succeed for non-existent email", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await authService.forgotPassword("nonexistent@example.com");

      expect(redisSessionService.storeToken).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("should verify token, update password, and delete token", async () => {
      (redisSessionService.getToken as any).mockResolvedValue(mockUser._id.toString());
      mockUserModel.findById.mockResolvedValue(mockUser);

      await authService.resetPassword("valid-token", "newpassword123");

      expect(redisSessionService.getToken).toHaveBeenCalledWith("reset", "valid-token");
      expect(mockUser.save).toHaveBeenCalled();
      expect(redisSessionService.deleteToken).toHaveBeenCalledWith("reset", "valid-token");
    });
  });

  // ─── Email Verification ────────────────────────────────────────────

  describe("verifyEmail", () => {
    it("should verify token, update user, and delete token", async () => {
      (redisSessionService.getToken as any).mockResolvedValue(mockUser._id.toString());
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await authService.verifyEmail("valid-verify-token");

      expect(redisSessionService.getToken).toHaveBeenCalledWith("verify", "valid-verify-token");
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(redisSessionService.deleteToken).toHaveBeenCalledWith("verify", "valid-verify-token");
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend if not verified", async () => {
      mockUserModel.findById.mockResolvedValue({ ...mockUser, isEmailVerified: false });

      await authService.resendVerificationEmail(mockUser._id.toString());

      expect(redisSessionService.storeToken).toHaveBeenCalledWith(
        "verify",
        expect.any(String),
        mockUser._id.toString(),
        expect.any(Number),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(AUTH_EVENTS.VERIFICATION_REQUIRED, {
        email: "test@example.com",
        token: expect.any(String),
      });
    });
  });

  // ─── Subscription ──────────────────────────────────────────────────

  describe("upgradeToPro", () => {
    it("should update plan and emit UPGRADED event", async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await authService.upgradeToPro(mockUser._id);

      expect(mockUser.plan).toBe("pro");
      expect(mockUser.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        AUTH_EVENTS.UPGRADED,
        expect.objectContaining({
          userId: mockUser._id.toString(),
          newPlan: "pro",
        }),
      );
      expect(result.plan).toBe("pro");
    });
  });
});
