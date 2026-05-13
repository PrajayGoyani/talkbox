import type { AuthResponseDto, LoginRequestDto, SignupRequestDto, UserDto } from "shared/types/auth.dto";

import { RESET_TOKEN_TTL, VERIFY_TOKEN_TTL } from "@config/env";
import { IUser } from "@models/user.model";
import { UserRepository, userRepository } from "@repositories/user.repository";
import { redisSessionService } from "@services/infra/redis.service";
import { AppError } from "@utils/AppError";
import { AUTH_EVENTS, eventBus } from "@utils/event-bus";
import { generateAccessToken, generateTokens, verifyRefreshToken } from "@utils/jwt";
import crypto from "crypto";
import { ObjectId } from "mongodb";

import { JWTPayload } from "@/types/socket.types";

// Internal aliases removed - using shared DTOs directly

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async signup({ username, email, password, name }: SignupRequestDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.exists({ email });
    if (existingUser) {
      throw AppError.conflict("User already exists", "USER_EXISTS");
    }

    const user = await this.userRepository.create({ username, email, password, name: name || null });
    const userObject = user.toObject();
    const tokens = generateTokens({ id: userObject._id.toString() });

    // Fire-and-forget verification email — don't block signup
    void this._sendVerificationEmail(userObject._id.toString(), email);

    return {
      user: this.userRepository.transformUser(user),
      ...tokens,
    };
  }

  async login({ username, password }: LoginRequestDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmailOrUsername(username);
    if (!user) {
      throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }

    // Migration Strategy: If the password hash is legacy (bcrypt), re-hash it with Argon2.
    // Legacy bcrypt hashes start with '$2', while Bun's default Argon2 starts with '$argon2'.
    if (user.password && user.password.startsWith("$2")) {
      user.password = await Bun.password.hash(password);
      await user.save();
    }

    // Performance: Use updateById for lastSeen to avoid full .save() overhead
    // which triggers expensive Mongoose lifecycle hooks.
    await this.userRepository.updateById(user._id, { $set: { lastSeen: new Date() } });

    const tokens = generateTokens({ id: user._id.toString() });
    return {
      user: this.userRepository.transformUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token required", "TOKEN_REQUIRED");
    }

    // FUTURE: Implement Refresh Token Rotation for maximum security.
    // This would involve generating a new refreshToken here and invalidating the old one
    // in the database/Redis to prevent reuse.
    const payload = verifyRefreshToken(refreshToken) as JWTPayload;
    const user = await this.userRepository.findById(payload.id);
    if (!user) throw AppError.unauthorized("Invalid user", "INVALID_USER");

    const accessToken = generateAccessToken({ id: user._id.toString() });

    return {
      user: this.userRepository.transformUser(user),
      accessToken,
      refreshToken, // Re-use the existing refresh token
    };
  }

  async getMe(userId: string | ObjectId): Promise<UserDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound("User");
    return this.userRepository.transformUser(user);
  }

  // ─── Password Reset ────────────────────────────────────────────────

  /**
   * Initiate a password reset flow.
   * Always returns void — never reveals whether the email exists (prevents enumeration).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ email });
    if (!user) return; // Silently ignore — prevent email enumeration

    const token = crypto.randomBytes(32).toString("hex");
    await redisSessionService.storeToken("reset", token, user._id.toString(), RESET_TOKEN_TTL);

    eventBus.emit(AUTH_EVENTS.PASSWORD_RESET_REQUESTED, { email, token });
  }

  /**
   * Complete password reset: verify token, update password, delete token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await redisSessionService.getToken("reset", token);
    if (!userId) throw AppError.badRequest("Invalid or expired reset token", "INVALID_RESET_TOKEN");

    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound("User");

    user.password = newPassword; // pre-save hook hashes it
    await user.save();
    await redisSessionService.deleteToken("reset", token);
  }

  // ─── Email Verification ────────────────────────────────────────────

  /**
   * Verify a user's email using the token from the verification link.
   */
  async verifyEmail(token: string): Promise<void> {
    const userId = await redisSessionService.getToken("verify", token);
    if (!userId) throw AppError.badRequest("Invalid or expired verification token", "INVALID_VERIFY_TOKEN");

    await this.userRepository.updateById(userId, { isEmailVerified: true });
    await redisSessionService.deleteToken("verify", token);
  }

  /**
   * Resend email verification for an authenticated user.
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound("User");
    if (user.isEmailVerified) throw AppError.badRequest("Email already verified", "ALREADY_VERIFIED");

    await this._sendVerificationEmail(userId, user.email);
  }

  /**
   * Internal helper: generate token and send verification email.
   * Errors are caught and logged — never blocks the caller.
   */
  private async _sendVerificationEmail(userId: string, email: string): Promise<void> {
    try {
      const token = crypto.randomBytes(32).toString("hex");
      await redisSessionService.storeToken("verify", token, userId, VERIFY_TOKEN_TTL);

      eventBus.emit(AUTH_EVENTS.VERIFICATION_REQUIRED, { email, token });
    } catch (err) {
      console.error("[AuthService] Failed to generate verification token:", err);
    }
  }

  // ─── Subscription ──────────────────────────────────────────────────

  async upgradeToPro(userId: string | ObjectId): Promise<UserDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound("User");

    const oldPlan = user.plan;
    user.plan = "pro";
    // Set expiry to 30 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    user.subscriptionExpiresAt = expiry;

    await user.save();

    // Emit event for side-effects (background sync, socket broadcast)
    eventBus.emit(AUTH_EVENTS.UPGRADED, {
      userId: userId.toString(),
      oldPlan,
      newPlan: "pro",
    });

    return this.userRepository.transformUser(user);
  }
}

export const authService = new AuthService(userRepository);
