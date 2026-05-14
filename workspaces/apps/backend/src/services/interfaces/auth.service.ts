import { AuthResponseDto, LoginRequestDto, SignupRequestDto, UserDto } from "shared/types/auth.dto";
import { ObjectId } from "mongodb";

export interface IAuthService {
  signup(dto: SignupRequestDto): Promise<AuthResponseDto>;
  login(dto: LoginRequestDto): Promise<AuthResponseDto>;
  refresh(refreshToken: string): Promise<AuthResponseDto>;
  getMe(userId: string | ObjectId): Promise<UserDto>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  resendVerificationEmail(userId: string): Promise<void>;
  upgradeToPro(userId: string | ObjectId): Promise<UserDto>;
}
