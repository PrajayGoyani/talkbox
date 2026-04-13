import UserModel, { IUser } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { generateAccessToken, generateTokens, verifyRefreshToken } from "../utils/jwt";

/**
 * @typedef {import('mongoose').Model} Model
 */

class AuthService {
  public User: any;

  constructor(userModel: typeof UserModel) {
    this.User = userModel;
  }

  async signup({
    username,
    email,
    password,
    name,
  }: {
    username: string;
    email: string;
    password: string;
    name?: string;
  }): Promise<object> {
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

  async login({ username, password }: { username: string; password: string }): Promise<object> {
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
    return {
      id: user._id,
      username: user.username,
      name: user.name || null,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }
}

export const authService = new AuthService(UserModel);
