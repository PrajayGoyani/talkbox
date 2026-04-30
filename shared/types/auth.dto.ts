/**
 * User Data Transfer Object
 */
export interface UserDto {
  id: string;
  username: string;
  name?: string | null;
  email: string;
  avatarUrl?: string;
  plan: "free" | "pro";
  subscriptionExpiresAt?: string | Date | null;
  isEmailVerified?: boolean;
  bio?: string | null;
}

/**
 * Authentication Response Data
 */
export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

/**
 * Login Request Payload
 */
export interface LoginRequestDto {
  username: string;
  password: string;
}

/**
 * Signup Request Payload
 */
export interface SignupRequestDto {
  username: string;
  email: string;
  password: string;
  name?: string;
}

/**
 * Forgot Password Request Payload
 */
export interface ForgotPasswordRequestDto {
  email: string;
}

/**
 * Reset Password Request Payload
 */
export interface ResetPasswordRequestDto {
  token: string;
  password: string;
}
