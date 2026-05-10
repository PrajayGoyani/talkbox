import { describe, it, expect, vi, beforeEach } from "vitest";
import { emailService } from "../email.service";
import nodemailer from "nodemailer";
import { APP_NAME, EMAIL_FROM, FRONTEND_URL } from "@config/env";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
    }),
  },
}));

describe("EmailService", () => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });

  beforeEach(() => {
    vi.clearAllMocks();
    (nodemailer.createTransport as any).mockReturnValue({
      sendMail: mockSendMail,
    });
    
    // Re-initialize or reset the service state if needed
    // Since emailService is a singleton, we might need to manually set transporter if it wasn't configured
    if (!emailService.isConfigured) {
      (emailService as any).transporter = nodemailer.createTransport({} as any);
    } else {
      (emailService as any).transporter.sendMail = mockSendMail;
    }
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
      })
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
      })
    );
  });

  it("should not crash if sendMail fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await emailService.sendResetEmail("test@example.com", "token");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to send reset email"),
      expect.any(Error)
    );
  });
});
