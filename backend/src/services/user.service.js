import { AppError } from "../utils/AppError.js";
import UserModel from "../models/user.model.js";

/**
 * @typedef {import('mongoose').Model} Model
 */

class UserService {
  /**
   * @param {Model} userModel
   */
  constructor(userModel) {
    /** @type {Model} */
    this.User = userModel;
  }

  /**
   * @param {string} username
   * @returns {Promise<Object>}
   */
  async searchByUsername(username) {
    const user = await this.User.findByEmailOrUsername(username);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  /**
   * @param {string | import('mongodb').ObjectId} userId
   * @param {string} fileOrUrl
   * @returns {Promise<Object>}
   */
  async uploadAvatar(userId, fileOrUrl) {
    const user = await this.User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    user.avatar_url = fileOrUrl;
    await user.save();
    return user;
  }

  /**
   * @param {string | import('mongodb').ObjectId} userId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, data) {
    const user = await this.User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    if (data.name) user.name = data.name;
    if (data.avatar_url) user.avatar_url = data.avatar_url;

    await user.save();
    return user;
  }
}

export const userService = new UserService(UserModel);

