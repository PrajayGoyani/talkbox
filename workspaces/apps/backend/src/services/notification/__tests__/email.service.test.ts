import { APP_NAME, FRONTEND_URL } from "@config/env";
import nodemailer from "nodemailer";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { EmailService } from "../email.service";

vi.mock("@config/env", () => ({
  APP_NAME: "Talkbox",
  FRONTEND_URL: "http://localhost:5173",
  EMAIL_FROM: "noreply@talkbox.app",
  SMTP_HOST: "localhost",
  SMTP_PORT: 587,
  SMTP_USER: "user",
  SMTP_PASS: "pass",
  RESEND_API_KEY: undefined,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
    }),
  },
}));

describe("EmailService", () => {
  let emailService: EmailService;
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });

  beforeEach(() => {
    vi.clearAllMocks();
    (nodemailer.createTransport as any).mockReturnValue({
      sendMail: mockSendMail,
    });

    emailService = new EmailService();
  });

  it("should send a verification email with the correct link", async () => {
    const to = "test@example.com";
    const token = "verify-token";

    await emailService.sendVerificationEmail(to, token);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining(APP_NAME),
        to,
        subject: expect.stringContaining("Verify"),
        html: expect.stringContaining(`${FRONTEND_URL}/#/verify-email?token=${token}`),
      }),
    );
  });

  it("should send a password reset email with the correct link", async () => {
    const to = "test@example.com";
    const token = "reset-token";

    await emailService.sendResetEmail(to, token);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining(APP_NAME),
        to,
        subject: expect.stringContaining("Reset"),
        html: expect.stringContaining(`${FRONTEND_URL}/#/reset-password?token=${token}`),
      }),
    );
  });

  it("should not crash if sendMail fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await emailService.sendResetEmail("test@example.com", "token");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to send reset email"), expect.any(Error));
  });

  it("should report isConfigured when SMTP is configured", () => {
    expect(emailService.isConfigured).toBe(true);
  });

  it("should use [EmailService] prefix in error messages", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("Connection refused"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await emailService.sendResetEmail("test@example.com", "token");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[EmailService]"), expect.any(Error));
  });

  describe("with Resend API configured", () => {
    const mockFetch = vi.fn();
    let originalFetch: any;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "resend-test-id" }),
      });
      process.env.RESEND_API_KEY = "test-resend-api-key";
      emailService = new EmailService();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      delete process.env.RESEND_API_KEY;
    });

    it("should report isConfigured as true", () => {
      expect(emailService.isConfigured).toBe(true);
    });

    it("should send verification email via Resend API", async () => {
      const to = "verify@example.com";
      const token = "resend-verify-token";

      await emailService.sendVerificationEmail(to, token);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-resend-api-key",
          }),
          body: expect.stringContaining(token),
        }),
      );
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("should send reset email via Resend API", async () => {
      const to = "reset@example.com";
      const token = "resend-reset-token";

      await emailService.sendResetEmail(to, token);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-resend-api-key",
          }),
          body: expect.stringContaining(token),
        }),
      );
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("should catch and log errors if Resend API fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await emailService.sendResetEmail("test@example.com", "token");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[EmailService] Failed to send reset email via Resend"),
        expect.any(Error),
      );
    });
  });
});
