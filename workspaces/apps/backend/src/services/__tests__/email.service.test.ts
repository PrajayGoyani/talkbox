import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock env before importing module under test
vi.mock("@config/env", () => ({
  SMTP_HOST: "",
  SMTP_PORT: 587,
  SMTP_USER: "",
  SMTP_PASS: "",
  EMAIL_FROM: "test@app.com",
  APP_NAME: "TestApp",
  FRONTEND_URL: "http://localhost:5173",
}));

// Mock nodemailer
const mockSendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    }),
  },
}));

describe("EmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not create transporter when SMTP is not configured", async () => {
    // Re-import with empty SMTP config
    const { emailService } = await import("../email.service");
    expect(emailService.isConfigured).toBe(false);
  });

  it("should no-op on sendResetEmail when not configured", async () => {
    const { emailService } = await import("../email.service");
    // Should not throw
    await emailService.sendResetEmail("test@example.com", "token123");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("should no-op on sendVerificationEmail when not configured", async () => {
    const { emailService } = await import("../email.service");
    await emailService.sendVerificationEmail("test@example.com", "token123");
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
