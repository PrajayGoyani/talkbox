import { generateAccessToken, generateTokens, verifyRefreshToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

/**
 * @typedef {import('mongoose').Model} Model
 */

class AuthService {
  /**
   * @param {Model} userModel
   */
  constructor(userModel) {
    /** @type {Model} */
    this.User = userModel;
  }

  /**
   * @param {Object} userData
   * @param {string} userData.username
   * @param {string} userData.email
   * @param {string} userData.password
   * @param {string} [userData.name]
   * @returns {Promise<Object>}
   */
  async signup({ username, email, password, name }) {
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

  /**
   * @param {Object} credentials
   * @param {string} credentials.username
   * @param {string} credentials.password
   * @returns {Promise<Object>}
   */
  async login({ username, password }) {
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

  /**
   * @param {string} refreshToken
   * @returns {Promise<Object>}
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token required", "TOKEN_REQUIRED");
    }

    try {
      const payload = verifyRefreshToken(refreshToken);

      const user = await this.User.findById(payload.id);
      if (!user) throw AppError.unauthorized("Invalid user", "INVALID_USER");
      const accessToken = generateAccessToken({ id: user._id.toString() });

      return { accessToken };
    } catch (error) {
      throw error;
    }
  }

  /**
   * @param {string | import('mongodb').ObjectId} userId
   * @returns {Promise<Object>}
   */
  async getMe(userId) {
    const user = await this.User.findById(userId).select("-password -__v").lean();
    if (!user) throw AppError.notFound("User");
    return user;
  }

  /**
   * @param {Object} user
   * @returns {Object}
   */
  sanitize(user) {
    return {
      id: user._id,
      username: user.username,
      name: user.name || null,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }
}

import UserModel from "../models/user.model.js";
export const authService = new AuthService(UserModel);
