import { COOKIE_SAMESITE, COOKIE_SECURE } from "@config/env";
import {
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  ResetPasswordRequest,
  SignupRequest,
} from "@controllers/types";
import { IAuthService } from "@services/interfaces/auth.service";
import { AppError } from "@utils/AppError";
import { CookieOptions, Request, Response } from "express";

const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SAMESITE,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
  partitioned: COOKIE_SECURE, // Partitioned requires Secure
};

const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...REFRESH_TOKEN_COOKIE_OPTIONS,
  maxAge: 5 * 60 * 60 * 1000, // 5 hours (matches JWT_EXPIRATION default)
};

export class AuthController {
  constructor(private authService: IAuthService) {}

  public signup = async (req: SignupRequest, res: Response) => {
    const result = await this.authService.signup(req.body);

    res.cookie("refresh_token", result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    res.cookie("access_token", result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);

    res.success(result);
  };

  public login = async (req: LoginRequest, res: Response) => {
    const result = await this.authService.login(req.body);

    res.cookie("refresh_token", result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    res.cookie("access_token", result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);

    res.success(result);
  };

  public logout = async (_req: Request, res: Response) => {
    res.clearCookie("refresh_token", REFRESH_TOKEN_COOKIE_OPTIONS);
    res.clearCookie("access_token", ACCESS_TOKEN_COOKIE_OPTIONS);
    res.success({ message: "Logged out successfully" });
  };

  public refresh = async (req: RefreshRequest, res: Response) => {
    const refreshToken = req.cookies.refresh_token;
    const result = await this.authService.refresh(refreshToken);
    res.cookie("access_token", result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.success(result);
  };

  public getMe = async (req: Request, res: Response) => {
    const user = await this.authService.getMe(req.user!.id);
    res.success(user);
  };

  public upgradeToPro = async (req: Request, res: Response) => {
    const user = await this.authService.upgradeToPro(req.user!.id);
    res.success(user);
  };

  public forgotPassword = async (req: ForgotPasswordRequest, res: Response) => {
    await this.authService.forgotPassword(req.body.email);
    // Deliberately vague response — prevents email enumeration
    res.success({ message: "If an account with that email exists, a reset link has been sent." });
  };

  public resetPassword = async (req: ResetPasswordRequest, res: Response) => {
    await this.authService.resetPassword(req.body.token, req.body.password);
    res.success({ message: "Password has been reset successfully." });
  };

  public verifyEmail = async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) throw AppError.badRequest("Token is required", "TOKEN_REQUIRED");
    await this.authService.verifyEmail(token);
    res.success({ message: "Email verified successfully." });
  };

  public resendVerification = async (req: Request, res: Response) => {
    await this.authService.resendVerificationEmail(req.user!.id);
    res.success({ message: "Verification email sent." });
  };
}
