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
  subscriptionExpiresAt?: string | null;
}

/**
 * Standard API Response Envelope
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
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
