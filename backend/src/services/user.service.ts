import User, { IUserModel } from "@models/user.model";
import { AppError } from "@utils/AppError";

class UserService {
  public User: IUserModel;

  constructor(userModel: IUserModel) {
    this.User = userModel;
  }

  async searchByUsername(username: string) {
    const user = await this.User.findByEmailOrUsername(username);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  async uploadAvatar(userId: string, fileOrUrl: string) {
    const user = await this.User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    user.avatar_url = fileOrUrl;
    await user.save();
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; bio?: string | null; avatar_url?: string }) {
    const user = await this.User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.avatar_url !== undefined) user.avatar_url = data.avatar_url;

    await user.save();
    return user;
  }
}

export const userService = new UserService(User as unknown as IUserModel);
