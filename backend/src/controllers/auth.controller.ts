import { COOKIE_SAMESITE, COOKIE_SECURE, NODE_ENV } from "@config/env";
import { authService } from "@services/auth.service";
import { CookieOptions, Request, Response } from "express";

import { LoginRequest, RefreshRequest, SignupRequest } from "./types";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SAMESITE as any,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
  partitioned: COOKIE_SECURE, // Partitioned requires Secure
};

export const signup = async (req: SignupRequest, res: Response) => {
  const result = (await authService.signup(req.body)) as { refreshToken?: string };

  res.cookie("refresh_token", result.refreshToken, COOKIE_OPTIONS);
  delete result.refreshToken;

  res.success(result);
};

export const login = async (req: LoginRequest, res: Response) => {
  const result = (await authService.login(req.body)) as { refreshToken?: string };

  res.cookie("refresh_token", result.refreshToken, COOKIE_OPTIONS);
  delete result.refreshToken;

  res.success(result);
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("refresh_token", COOKIE_OPTIONS);
  res.success({ message: "Logged out successfully" });
};

export const refresh = async (req: RefreshRequest, res: Response) => {
  const refreshToken = req.cookies.refresh_token;
  const result = await authService.refresh(refreshToken);
  res.success(result);
};

export const getMe = async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  res.success(user);
};

export const upgradeToPro = async (req: Request, res: Response) => {
  const user = await authService.upgradeToPro(req.user!.id);
  res.success(user);
};
