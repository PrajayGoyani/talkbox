import { AuthController } from "@controllers/auth.controller";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@config/env", () => ({
  COOKIE_SAMESITE: "lax",
  COOKIE_SECURE: false,
}));

describe("AuthController", () => {
  let req: any;
  let res: any;
  let authController: AuthController;
  let authService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = {
      signup: vi.fn(),
      login: vi.fn(),
      refresh: vi.fn(),
      getMe: vi.fn(),
      upgradeToPro: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerificationEmail: vi.fn(),
    };
    authController = new AuthController(authService);
    req = { body: {}, query: {}, cookies: {}, user: { id: "user123" } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      success: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    };
  });

  describe("signup", () => {
    it("should call authService.signup and set cookies", async () => {
      const result = {
        user: { id: "u1", email: "test@example.com" },
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
      };
      req.body = { email: "test@example.com", password: "password123", username: "testuser" };
      authService.signup.mockResolvedValue(result);

      await authController.signup(req, res);

      expect(authService.signup).toHaveBeenCalledWith(req.body);
      expect(res.cookie).toHaveBeenCalledWith("refresh_token", "refresh-token-456", expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith("access_token", "access-token-123", expect.any(Object));
      expect(res.success).toHaveBeenCalledWith(result);
    });
  });

  describe("login", () => {
    it("should call authService.login and set cookies", async () => {
      const result = {
        user: { id: "u1" },
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
      };
      req.body = { email: "test@example.com", password: "password123" };
      authService.login.mockResolvedValue(result);

      await authController.login(req, res);

      expect(authService.login).toHaveBeenCalledWith(req.body);
      expect(res.cookie).toHaveBeenCalledWith("refresh_token", "refresh-token-456", expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith("access_token", "access-token-123", expect.any(Object));
      expect(res.success).toHaveBeenCalledWith(result);
    });
  });

  describe("logout", () => {
    it("should clear auth cookies", async () => {
      await authController.logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith("access_token", expect.any(Object));
      expect(res.success).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });
  });

  describe("refresh", () => {
    it("should read refresh_token cookie and set new access_token", async () => {
      req.cookies.refresh_token = "old-refresh-token";
      authService.refresh.mockResolvedValue({ accessToken: "new-access-token" });

      await authController.refresh(req, res);

      expect(authService.refresh).toHaveBeenCalledWith("old-refresh-token");
      expect(res.cookie).toHaveBeenCalledWith("access_token", "new-access-token", expect.any(Object));
      expect(res.success).toHaveBeenCalledWith({ accessToken: "new-access-token" });
    });
  });

  describe("getMe", () => {
    it("should call authService.getMe with user id", async () => {
      const user = { id: "user123", username: "testuser" };
      authService.getMe.mockResolvedValue(user);

      await authController.getMe(req, res);

      expect(authService.getMe).toHaveBeenCalledWith("user123");
      expect(res.success).toHaveBeenCalledWith(user);
    });
  });

  describe("upgradeToPro", () => {
    it("should call authService.upgradeToPro with user id", async () => {
      const proUser = { id: "user123", plan: "pro" };
      authService.upgradeToPro.mockResolvedValue(proUser);

      await authController.upgradeToPro(req, res);

      expect(authService.upgradeToPro).toHaveBeenCalledWith("user123");
      expect(res.success).toHaveBeenCalledWith(proUser);
    });
  });

  describe("forgotPassword", () => {
    it("should call authService.forgotPassword and return success", async () => {
      req.body.email = "test@example.com";
      authService.forgotPassword.mockResolvedValue();

      await authController.forgotPassword(req, res);

      expect(authService.forgotPassword).toHaveBeenCalledWith("test@example.com");
      expect(res.success).toHaveBeenCalledWith({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    });
  });

  describe("resetPassword", () => {
    it("should call authService.resetPassword and return success", async () => {
      req.body = { token: "valid-token", password: "newpassword123" };
      authService.resetPassword.mockResolvedValue();

      await authController.resetPassword(req, res);

      expect(authService.resetPassword).toHaveBeenCalledWith("valid-token", "newpassword123");
      expect(res.success).toHaveBeenCalledWith({
        message: "Password has been reset successfully.",
      });
    });
  });

  describe("verifyEmail", () => {
    it("should verify email with token from query params", async () => {
      req.query.token = "verify-token-123";
      authService.verifyEmail.mockResolvedValue();

      await authController.verifyEmail(req, res);

      expect(authService.verifyEmail).toHaveBeenCalledWith("verify-token-123");
      expect(res.success).toHaveBeenCalledWith({
        message: "Email verified successfully.",
      });
    });

    it("should throw if token is missing", async () => {
      req.query = {};

      await expect(authController.verifyEmail(req, res)).rejects.toThrow("Token is required");
    });
  });

  describe("resendVerification", () => {
    it("should call authService.resendVerificationEmail with user id", async () => {
      authService.resendVerificationEmail.mockResolvedValue();

      await authController.resendVerification(req, res);

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith("user123");
      expect(res.success).toHaveBeenCalledWith({
        message: "Verification email sent.",
      });
    });
  });
});
