import { AuthController } from "@controllers/auth.controller";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@config/env", () => ({
  COOKIE_SAMESITE: "lax",
  COOKIE_SECURE: false,
}));

describe("AuthController - Password Reset & Email Verification", () => {
  let req: any;
  let res: any;
  let authController: AuthController;
  let authService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = {
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerificationEmail: vi.fn(),
    };
    authController = new AuthController(authService);
    req = { body: {}, query: {}, user: { id: "user123" } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      success: vi.fn().mockReturnThis(),
    };
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
