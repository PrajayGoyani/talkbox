import type { AuthResponseDto, LoginRequestDto, SignupRequestDto, UserDto } from "shared/types/auth.dto";

import { api, setTokenProvider } from "$lib/services/api.client";
import { ApiError } from "$utils/errors";
import { storage } from "$utils/storage";

import type { AuthObserver } from "./auth-observer";

// Access tokens expire in 15min typically; refresh 1 min before
const REFRESH_INTERVAL_MS = 14 * 60 * 1000;
const BOOT_TIMEOUT_MS = 3000;

class AuthStore {
  user: UserDto | null = $state(null);
  accessToken: string | null = $state(null);
  isCheckingAuth: boolean = $state(true);
  error: string | null = $state(null);
  loading: boolean = $state(false);
  isSlowBoot: boolean = $state(false);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | null = null;
  private observers: Set<AuthObserver> = new Set();

  isVerified = $derived(this.user?.isEmailVerified ?? false);
  isRestricted = $derived(!this.isVerified && this.user?.plan === "free");

  constructor() {
    setTokenProvider(() => this.accessToken);
    void this.init();
  }

  /**
   * Register a store to react to auth changes.
   * Returns a cleanup function to unregister.
   */
  subscribe(observer: AuthObserver) {
    this.observers.add(observer);
    // If already logged in, notify immediately
    if (this.user?.id) {
      observer.init?.(this.user.id);
    }
    return () => this.observers.delete(observer);
  }

  private async init() {
    this.bootTimer = setTimeout(() => {
      this.isSlowBoot = true;
    }, BOOT_TIMEOUT_MS);

    const startTime = Date.now();
    if (typeof window === "undefined") {
      this.clearBootTimer();
      return;
    }

    try {
      const refreshed = await this.silentRefresh();

      if (!refreshed) {
        // If refresh failed, the access token is missing, but the session cookie might still be valid.
        // Try to fetch the user profile directly to verify the session.
        console.log("[AuthStore] Silent refresh failed, trying fetchMe...");
        await this.fetchMe();
      }
    } catch (e) {
      // If both fail, we are definitely logged out
      console.warn("[AuthStore] Auth initialization failed. Redirecting to login.", e);
      this.clearAuth();
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
      this.clearBootTimer();
      this.isCheckingAuth = false;
    }
  }

  private clearBootTimer() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
  }

  /** Perform silent refresh using HttpOnly refresh token cookie */
  async silentRefresh(): Promise<boolean> {
    try {
      const data = await api.post<AuthResponseDto>("/auth/refresh");
      this.setAuth(data);
      return true;
    } catch (e) {
      // If refresh fails, we're not logged in, but don't log error as it's expected if no cookie
      return false;
    }
  }

  /** Fetch user profile using current accessToken */
  private async fetchMe() {
    try {
      const user = await api.get<UserDto>("/auth/me");
      this.user = user;
      storage.setUser(user);
      this.notifyLogin(user.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        this.clearAuth();
      }
      throw e;
    }
  }

  /** Schedule next silent refresh before token expires */
  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      void this.silentRefresh();
    }, REFRESH_INTERVAL_MS);
  }

  async login(credentials: LoginRequestDto) {
    this.loading = true;
    this.error = null;
    try {
      const data = await api.post<AuthResponseDto>("/auth/login", credentials);
      this.setAuth(data);
      return true;
    } catch (e: any) {
      this.error = e.message || "Login failed";
      return false;
    } finally {
      this.loading = false;
    }
  }

  async signup(data: SignupRequestDto) {
    this.loading = true;
    this.error = null;
    try {
      const authData = await api.post<AuthResponseDto>("/auth/signup", data);
      this.setAuth(authData);
      return true;
    } catch (e: any) {
      this.error = e.message || "Signup failed";
      return false;
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("Logout request failed, clearing local auth anyway", e);
    } finally {
      this.clearAuth();
    }
  }

  private notifyLogout() {
    this.observers.forEach((obs) => obs.clear());
  }

  private notifyLogin(userId: string) {
    this.observers.forEach((obs) => obs.init?.(userId));
  }

  private clearAuth() {
    this.clearUserDrafts();
    this.user = null;
    this.accessToken = null;
    storage.clearAuth();
    this.notifyLogout();
  }

  private clearUserDrafts() {
    if (typeof window === "undefined" || !this.user?.id) return;

    const prefix = `chat_draft_${this.user.id}_`;
    Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => localStorage.removeItem(key));
  }

  private setAuth(data: AuthResponseDto) {
    this.user = data.user;
    this.accessToken = data.accessToken;
    storage.setUser(data.user);
    this.scheduleRefresh();
    this.notifyLogin(data.user.id);
  }

  /** Update user profile (name, bio) */
  async updateProfile(data: { name?: string | null; bio?: string | null }) {
    try {
      const updatedUser = await api.patch<UserDto>("/user/profile", data);
      this.user = updatedUser;
      storage.setUser(updatedUser);
      return { success: true, data: updatedUser };
    } catch (e: any) {
      console.error("Profile update error", e);
      throw e;
    }
  }

  /** Upload user avatar */
  async updateAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please upload an image file");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image size must be less than 5MB");
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post<{ avatar_url: string }>("/user/avatar", formData);
      if (res.avatar_url) {
        this.user = { ...this.user, avatarUrl: res.avatar_url } as UserDto;
        storage.setUser(this.user);
      }
      return { success: true, data: res };
    } catch (e: any) {
      console.error("Avatar upload error", e);
      throw e;
    }
  }

  /** Simulate Pro upgrade */
  async upgradeToPro() {
    this.loading = true;
    try {
      const data = await api.post<UserDto>("/auth/upgrade-pro");
      this.user = data;
      storage.setUser(data);
      return { success: true, data };
    } catch (e: any) {
      console.error("Upgrade error", e);
      throw e;
    } finally {
      this.loading = false;
    }
  }

  // ─── Password Reset ────────────────────────────────────────────────

  /** Request a password reset email */
  async forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    this.loading = true;
    this.error = null;
    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", { email });
      return { success: true, message: res.message };
    } catch (e: any) {
      this.error = e.message || "Network error occurred";
      return { success: false };
    } finally {
      this.loading = false;
    }
  }

  /** Reset password using a token from email */
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message?: string }> {
    this.loading = true;
    this.error = null;
    try {
      const res = await api.post<{ message: string }>("/auth/reset-password", { token, password });
      return { success: true, message: res.message };
    } catch (e: any) {
      this.error = e.message || "Network error occurred";
      return { success: false };
    } finally {
      this.loading = false;
    }
  }

  // ─── Email Verification ────────────────────────────────────────────

  /** Verify email using token from verification link */
  async verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
    this.loading = true;
    this.error = null;
    try {
      const res = await api.get<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);

      if (this.user) {
        this.user = { ...this.user, isEmailVerified: true } as UserDto;
        storage.setUser(this.user);
      }

      return { success: true, message: res.message };
    } catch (e: any) {
      this.error = e.message || "Verification failed";
      return { success: false };
    } finally {
      this.loading = false;
    }
  }

  /** Resend verification email (authenticated) */
  async resendVerification() {
    try {
      await api.post("/auth/resend-verification");
      return true;
    } catch (e) {
      console.error("Resend verification error", e);
      return false;
    }
  }
}

export const authStore = new AuthStore();
