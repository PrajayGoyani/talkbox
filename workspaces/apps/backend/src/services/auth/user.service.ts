import { IUserRepository } from "@repositories/interfaces/user.repository";
import { IRedisSessionService } from "@services/infra/interfaces";
import { IUserService } from "@services/interfaces/user.service";
import { AppError } from "@utils/AppError";
import { eventBus, USER_EVENTS } from "@utils/event-bus";

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private redisSessionService: IRedisSessionService,
  ) {}

  async searchByUsername(username: string) {
    const user = await this.userRepository.findByEmailOrUsername(username);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }
    return this.userRepository.transformUser(user);
  }

  async uploadAvatar(userId: string, fileOrUrl: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    user.avatar_url = fileOrUrl;
    await user.save();

    // Invalidate cache across all server instances
    await this.redisSessionService.publishCacheInvalidation("user", userId.toString());

    // Broadcast update to all partners in real-time
    eventBus.emit(USER_EVENTS.PROFILE_UPDATED, {
      userId: userId.toString(),
      profile: { avatarUrl: fileOrUrl },
    });

    return this.userRepository.transformUser(user);
  }

  async updateProfile(userId: string, data: { name?: string; bio?: string | null; avatar_url?: string }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.avatar_url !== undefined) user.avatar_url = data.avatar_url;

    await user.save();

    // Invalidate cache across all server instances
    await this.redisSessionService.publishCacheInvalidation("user", userId.toString());

    // Broadcast update to all partners in real-time
    eventBus.emit(USER_EVENTS.PROFILE_UPDATED, {
      userId: userId.toString(),
      profile: {
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
      },
    });

    return this.userRepository.transformUser(user);
  }
}
