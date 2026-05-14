import { APP_NAME, EMAIL_FROM, FRONTEND_URL, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from "@config/env";
import nodemailer from "nodemailer";

import { IEmailService } from "../interfaces/email.service";

/**
 * Email service for sending transactional emails (password reset, email verification).
 *
 * Gracefully no-ops if SMTP is not configured — the app continues to work
 * without email features. This avoids breaking dev setups that don't have SMTP.
 */
export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn("[EmailService] SMTP not configured. Email features disabled.");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Send a password reset email with a link containing the reset token.
   */
  async sendResetEmail(to: string, token: string): Promise<void> {
    if (!this.transporter) return;

    const resetUrl = `${FRONTEND_URL}/#/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"${APP_NAME}" <${EMAIL_FROM}>`,
        to,
        subject: `Reset your ${APP_NAME} password`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #0f172a; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset your ${APP_NAME} password. Click the button below to choose a new one.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; line-height: 1.5;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[EmailService] Failed to send reset email:", err);
    }
  }

  /**
   * Send an email verification link to a newly registered user.
   */
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    if (!this.transporter) return;

    const verifyUrl = `${FRONTEND_URL}/#/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"${APP_NAME}" <${EMAIL_FROM}>`,
        to,
        subject: `Verify your ${APP_NAME} email`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #0f172a; margin-bottom: 16px;">Verify your email</h2>
            <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
              Welcome to ${APP_NAME}! Please verify your email address to complete your registration.
            </p>
            <a href="${verifyUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Verify Email
            </a>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; line-height: 1.5;">
              This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[EmailService] Failed to send verification email:", err);
    }
  }
}

export const emailService = {};
