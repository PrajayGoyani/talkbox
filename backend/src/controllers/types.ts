import type {
  ForgotPasswordRequestDto,
  LoginRequestDto,
  ResetPasswordRequestDto,
  SignupRequestDto,
} from "@root/shared/types/auth.dto";
import type { AcceptChatRequestDto, RejectChatRequestDto } from "@root/shared/types/chat.dto";

import { Request } from "express";

export type AcceptChatRequest = Request<AcceptChatRequestDto, {}, {}>;
export type RejectChatRequest = Request<RejectChatRequestDto, {}, {}>;

export interface RefreshRequest extends Request {
  cookies: {
    refresh_token: string;
  };
}

export type SignupRequest = Request<{}, {}, SignupRequestDto>;
export type LoginRequest = Request<{}, {}, LoginRequestDto>;

export type ForgotPasswordRequest = Request<{}, {}, ForgotPasswordRequestDto>;
export type ResetPasswordRequest = Request<{}, {}, ResetPasswordRequestDto>;
