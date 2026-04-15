import { Request } from "express";

interface AccpetChatPayload {
  chatId: string;
}

interface RejectChatPayload {
  chatId: string;
}

export type AcceptChatRequest = Request<AccpetChatPayload, {}, {}>;
export type RejectChatRequest = Request<RejectChatPayload, {}, {}>;

// Auth Request Types
export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RefreshRequest extends Request {
  cookies: {
    refresh_token: string;
  };
}

export type SignupRequest = Request<{}, {}, SignupPayload>;
export type LoginRequest = Request<{}, {}, LoginPayload>;
