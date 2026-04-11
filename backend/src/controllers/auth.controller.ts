import { Request, Response, NextFunction, CookieOptions } from "express";
import { authService } from "../services/auth.service.js";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
  partitioned: true, // CHIPS: Required for cross-site cookies in modern browsers
};

// Use Lax for local development if not on HTTPS
if (process.env.NODE_ENV === "development") {
  COOKIE_OPTIONS.secure = false;
  COOKIE_OPTIONS.sameSite = "lax";
  COOKIE_OPTIONS.partitioned = false;
}

export const signup = async (req: Request, res: Response) => {
  const result: any = await authService.signup(req.body);

  res.cookie("refresh_token", result.refreshToken, COOKIE_OPTIONS);
  delete result.refreshToken;

  res.success(result);
};

export const login = async (req: Request, res: Response) => {
  const result: any = await authService.login(req.body);

  res.cookie("refresh_token", result.refreshToken, COOKIE_OPTIONS);
  delete result.refreshToken;

  res.success(result);
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("refresh_token", COOKIE_OPTIONS);
  res.success({ message: "Logged out successfully" });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;
  const result = await authService.refresh(refreshToken);
  res.success(result);
};

export const getMe = async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  res.success(user);
};
