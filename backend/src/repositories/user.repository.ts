import User, { IUser, IUserModel } from "@models/user.model";
import { ObjectId } from "mongodb";
import { SanitizedUser } from "@/services/auth.service";

export class UserRepository {
  constructor(public userModel: IUserModel) {}

  public async findById(id: string | ObjectId) {
    return this.userModel.findById(id);
  }

  public async findOne(query: Record<string, any>) {
    return this.userModel.findOne(query);
  }

  public async exists(query: Record<string, any>) {
    return this.userModel.exists(query);
  }

  public async findByEmailOrUsername(username: string) {
    return this.userModel.findByEmailOrUsername(username);
  }

  public async create(data: Partial<IUser>) {
    return this.userModel.create(data);
  }

  public async updateById(id: string | ObjectId, update: any) {
    return this.userModel.findByIdAndUpdate(id, update, { returnDocument: "after" });
  }

  public transformUser(user: IUser): SanitizedUser {
    const obj = user.toObject ? user.toObject() : (user as any);
    return {
      id: obj._id.toString(),
      username: obj.username,
      name: obj.name || null,
      email: obj.email,
      avatarUrl: user.avatarUrl, // Use virtual
      plan: obj.plan,
      subscriptionExpiresAt: obj.subscriptionExpiresAt,
      isEmailVerified: obj.isEmailVerified ?? false,
      bio: obj.bio || null,
    };
  }
}

export const userRepository = new UserRepository(User);
