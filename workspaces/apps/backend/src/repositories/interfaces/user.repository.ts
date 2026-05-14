import { IUser } from "@models/user.model";
import { ObjectId } from "mongodb";
import { UserDto } from "shared/types/auth.dto";

export interface IUserRepository {
  findById(id: string | ObjectId): Promise<IUser | null>;
  findOne(query: Record<string, any>): Promise<IUser | null>;
  exists(query: Record<string, any>): Promise<any>;
  findByEmailOrUsername(username: string): Promise<IUser | null>;
  create(data: Partial<IUser>): Promise<IUser>;
  updateById(id: string | ObjectId, update: any): Promise<IUser | null>;
  findByIds(ids: string[] | ObjectId[], select?: string): Promise<any>;
  transformUser(user: IUser): UserDto;
}
