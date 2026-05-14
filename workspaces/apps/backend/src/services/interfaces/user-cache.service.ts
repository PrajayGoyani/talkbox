import { UserDto } from "shared/types/auth.dto";

export interface IUserCacheService {
  getUser(userId: string): Promise<UserDto | null>;
  invalidate(userId: string): void;
  set(userId: string, user: UserDto): void;
}
