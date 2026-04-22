import User, { IUser, IUserModel } from "@models/user.model";
import { AppError } from "@utils/AppError";
import { generateAccessToken, generateTokens, verifyRefreshToken } from "@utils/jwt";

import { LoginPayload, SignupPayload } from "@/controllers/types";

/**
 * @typedef {import('mongoose').Model} Model
 */

class AuthService {
  public User: IUserModel;

  constructor(userModel: IUserModel) {
    this.User = userModel;
  }

  async signup({ username, email, password, name }: SignupPayload): Promise<object> {
    const existingUser = await this.User.exists({ email });
    if (existingUser) {
      throw AppError.conflict("User already exists", "USER_EXISTS");
    }

    const user = await this.User.create({ username, email, password, name: name || null });
    const userObject = user.toObject();
    const tokens = generateTokens({ id: userObject._id.toString() });
    return {
      user: this.sanitize(user),
      ...tokens,
    };
  }

  async login({ username, password }: LoginPayload): Promise<object> {
    const user = await this.User.findByEmailOrUsername(username);
    if (!user) {
      throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }

    user.lastSeen = new Date();
    await user.save();

    const userObject = user.toObject();
    const tokens = generateTokens({ id: userObject._id.toString() });
    return {
      user: this.sanitize(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<object> {
    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token required", "TOKEN_REQUIRED");
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await this.User.findById((payload as any).id);
    if (!user) throw AppError.unauthorized("Invalid user", "INVALID_USER");
    const accessToken = generateAccessToken({ id: user._id.toString() });

    return { accessToken };
  }

  async getMe(userId: string | import("mongodb").ObjectId): Promise<object> {
    const user = await this.User.findById(userId).select("-password -__v").lean();
    if (!user) throw AppError.notFound("User");
    return user;
  }

  sanitize(user: IUser): object {
    const obj = user.toObject ? user.toObject() : user;
    return {
      id: obj._id,
      username: obj.username,
      name: obj.name || null,
      email: obj.email,
      avatarUrl: obj.avatarUrl,
      plan: obj.plan,
      subscriptionExpiresAt: obj.subscriptionExpiresAt,
    };
  }

  async upgradeToPro(userId: string | import("mongodb").ObjectId): Promise<object> {
    const user = await this.User.findById(userId);
    if (!user) throw AppError.notFound("User");

    user.plan = "pro";
    // Set expiry to 30 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    user.subscriptionExpiresAt = expiry;

    await user.save();
    return this.sanitize(user);
  }
}

export const authService = new AuthService(User);
