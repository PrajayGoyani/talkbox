import User, { IUser, IUserModel } from "@models/user.model";
import { toUserDto } from "@utils/mappers";
import { ObjectId } from "mongodb";
import { UserDto } from "shared/types/auth.dto";

import { IUserRepository } from "./interfaces/user.repository";

export class UserRepository implements IUserRepository {
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

  public async findByIds(ids: string[] | ObjectId[], select?: string) {
    const query = this.userModel.find({ _id: { $in: ids } });
    if (select) query.select(select);
    return query;
  }

  public transformUser(user: IUser): UserDto {
    return toUserDto(user);
  }
}
