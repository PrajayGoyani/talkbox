import User, { IUser, IUserModel } from "@models/user.model";
import { redisService } from "@services/redis.service";
import { AppError } from "@utils/AppError";
import { generateAccessToken, generateTokens, verifyRefreshToken } from "@utils/jwt";
import { ObjectId } from "mongodb";

import { LoginPayload, SignupPayload } from "@/controllers/types";

export interface SanitizedUser {
  id: string;
  username: string;
  name: string | null;
  email: string;
  avatarUrl: string;
  plan: "free" | "pro";
  subscriptionExpiresAt: Date | null;
}

export interface AuthResponse {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  public User: IUserModel;

  constructor(userModel: IUserModel) {
    this.User = userModel;
  }

  async signup({ username, email, password, name }: SignupPayload): Promise<AuthResponse> {
    const existingUser = await this.User.exists({ email });
    if (existingUser) {
      throw AppError.conflict("User already exists", "USER_EXISTS");
    }

    const user = await this.User.create({ username, email, password, name: name || null });
    const userObject = user.toObject();
    const tokens = generateTokens({ id: userObject._id.toString() });
    return {
      user: this.sanitize(user) as SanitizedUser,
      ...tokens,
    };
  }

  async login({ username, password }: LoginPayload): Promise<AuthResponse> {
    const user = await this.User.findByEmailOrUsername(username);
    if (!user) {
      throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }

    // Performance: Use findByIdAndUpdate for lastSeen to avoid full .save() overhead
    // which triggers expensive Mongoose lifecycle hooks.
    await this.User.findByIdAndUpdate(user._id, { $set: { lastSeen: new Date() } });

    const userObject = user.toObject();
    const tokens = generateTokens({ id: userObject._id.toString() });
    return {
      user: this.sanitize(user) as SanitizedUser,
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token required", "TOKEN_REQUIRED");
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await this.User.findById((payload as any).id);
    if (!user) throw AppError.unauthorized("Invalid user", "INVALID_USER");
    const accessToken = generateAccessToken({ id: user._id.toString() });

    return { accessToken };
  }

  async getMe(userId: string | ObjectId): Promise<IUser> {
    const user = await this.User.findById(userId).select("-password -__v");
    if (!user) throw AppError.notFound("User");
    return user;
  }

  sanitize(user: IUser): SanitizedUser {
    const obj = user.toObject ? user.toObject() : (user as any);
    return {
      id: obj._id,
      username: obj.username,
      name: obj.name || null,
      email: obj.email,
      avatarUrl: user.avatarUrl, // Use virtual
      plan: obj.plan,
      subscriptionExpiresAt: obj.subscriptionExpiresAt,
    };
  }

  async upgradeToPro(userId: string | ObjectId): Promise<SanitizedUser> {
    const user = await this.User.findById(userId);
    if (!user) throw AppError.notFound("User");

    user.plan = "pro";
    // Set expiry to 30 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    user.subscriptionExpiresAt = expiry;

    await user.save();
    
    // Invalidate caches across all server instances
    await redisService.publishCacheInvalidation("user", userId.toString());

    return this.sanitize(user);
  }
}

export const authService = new AuthService(User);
