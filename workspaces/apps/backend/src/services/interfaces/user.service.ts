export interface IUserService {
  searchByUsername(username: string): Promise<any>;
  uploadAvatar(userId: string, fileOrUrl: string): Promise<any>;
  updateProfile(userId: string, data: { name?: string; bio?: string | null; avatar_url?: string }): Promise<any>;
}
