import { UserRepository, userRepository } from "@repositories/user.repository";
import { redisService } from "@services/redis.service";
import { socketService } from "@services/socket.service";
import { AppError } from "@utils/AppError";

class UserService {
  constructor(private userRepository: UserRepository) {}

  async searchByUsername(username: string) {
    const user = await this.userRepository.findByEmailOrUsername(username);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  async uploadAvatar(userId: string, fileOrUrl: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    user.avatar_url = fileOrUrl;
    await user.save();

    // Invalidate cache across all server instances
    await redisService.publishCacheInvalidation("user", userId.toString());

    // Broadcast update to all partners in real-time
    void socketService.notifyProfileUpdate(userId.toString(), { avatarUrl: fileOrUrl });

    return user;
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
    await redisService.publishCacheInvalidation("user", userId.toString());

    // Broadcast update to all partners in real-time
    void socketService.notifyProfileUpdate(userId.toString(), {
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    });

    return user;
  }
}

export const userService = new UserService(userRepository);
