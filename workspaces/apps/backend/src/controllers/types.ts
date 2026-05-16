import type {
  ForgotPasswordRequestDto,
  LoginRequestDto,
  ResetPasswordRequestDto,
  SignupRequestDto,
} from "shared/types/auth.dto";
import type { AcceptChatRequestDto, RejectChatRequestDto } from "shared/types/chat.dto";

import { Request } from "express";

export type AcceptChatRequest = Request<AcceptChatRequestDto & ChatIdParam, {}, {}>;
export type RejectChatRequest = Request<RejectChatRequestDto & ChatIdParam, {}, {}>;

export interface ChatIdParam {
  [key: string]: string;
  chatId: string;
}

export interface RefreshRequest extends Request {
  cookies: {
    refresh_token: string;
  };
}

export type SignupRequest = Request<{}, {}, SignupRequestDto>;
export type LoginRequest = Request<{}, {}, LoginRequestDto>;

export type ForgotPasswordRequest = Request<{}, {}, ForgotPasswordRequestDto>;
export type ResetPasswordRequest = Request<{}, {}, ResetPasswordRequestDto>;
