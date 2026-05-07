import type { ApiResponse } from "shared/types/api.dto";
import type { AuthResponseDto, LoginRequestDto, SignupRequestDto, UserDto } from "shared/types/auth.dto";

import { API_BASE } from "$lib/config";
import { ApiError } from "$utils/errors";
import { storage } from "$utils/storage";

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

  constructor() {
    void this.init();
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
      // Try silent refresh first (HttpOnly cookie may have a valid refresh token)
      const refreshed = await this.silentRefresh();

      if (!refreshed) {
        // Fallback: check storage for cached user (but we no longer store/check tokens here)
        const storedUser = storage.getUser();
        if (storedUser) {
          this.user = storedUser;
        }
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
    } finally {
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

  /**
   * Silent refresh: POST to /auth/refresh with credentials (HttpOnly cookie).
   * On success: updates accessToken.
   * Returns true if refresh succeeded.
   */
  async silentRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: this.getHeaders(true),
      });

      if (!response.ok) return false;

      const res = await response.json();
      if (res.success && res.data?.accessToken) {
        this.accessToken = res.data.accessToken;

        // If we have cached user data, keep it; otherwise fetch /me
        if (!this.user) {
          const storedUser = storage.getUser();
          if (storedUser) {
            this.user = storedUser;
          } else {
            await this.fetchMe();
          }
        }

        this.scheduleRefresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** Fetch user profile using current accessToken */
  private async fetchMe() {
    try {
      const resp = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });
      if (resp.status === 401) {
        this.clearAuth();
        return;
      }
      if (!resp.ok) return;
      const res = await resp.json();
      if (res.success && res.data) {
        this.user = res.data;
        storage.setUser(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e);
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
    let success = false;
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: this.getHeaders(true),
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response);
      }

      const res: ApiResponse<AuthResponseDto> = await response.json();

      if (res.success) {
        this.setAuth(res.data);
        success = true;
      } else {
        this.error = res.error?.message || "Login failed";
      }
    } catch (e) {
      if (!ApiError.handleRateLimit(e)) {
        this.error = e instanceof ApiError ? e.message : "Network error occurred";
      } else {
        this.error = "Too many attempts. Please wait.";
      }
    } finally {
      this.loading = false;
    }
    return success;
  }

  async signup(data: SignupRequestDto) {
    this.loading = true;
    this.error = null;
    let success = false;
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: this.getHeaders(true),
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response);
      }

      const res: ApiResponse<AuthResponseDto> = await response.json();

      if (res.success) {
        this.setAuth(res.data);
        success = true;
      } else {
        this.error = res.error?.message || "Signup failed";
      }
    } catch (e) {
      if (!ApiError.handleRateLimit(e)) {
        this.error = e instanceof ApiError ? e.message : "Network error occurred";
      } else {
        this.error = "Too many attempts. Please wait.";
      }
    } finally {
      this.loading = false;
    }
    return success;
  }

  async logout() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    try {
      if (typeof window !== "undefined") {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      }
    } catch (e) {
      console.error("Logout error", e);
    }
    this.clearAuth();
  }

  private clearAuth() {
    this.user = null;
    this.accessToken = null;
    storage.clearAuth();
  }

  private setAuth(data: AuthResponseDto) {
    this.user = data.user;
    this.accessToken = data.accessToken;
    storage.setUser(data.user);
    this.scheduleRefresh();
  }

  /** Update user profile (name, bio) */
  async updateProfile(data: { name?: string | null; bio?: string | null }) {
    try {
      const resp = await fetch(`${API_BASE}/user/profile`, {
        method: "PATCH",
        headers: this.getHeaders(true),
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!resp.ok) {
        throw await ApiError.fromResponse(resp);
      }

      const res = await resp.json();
      if (res.success && res.data) {
        this.user = { ...this.user, ...res.data } as UserDto;
        storage.setUser(this.user);
      }
      return res;
    } catch (e: unknown) {
      ApiError.handleRateLimit(e);
      console.error("Profile update error", e);
      throw e;
    }
  }

  /** Upload user avatar */
  async updateAvatar(file: File) {
    // Client-side validation
    if (!file.type.startsWith("image/")) {
      throw new Error("Please upload an image file");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image size must be less than 5MB");
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const resp = await fetch(`${API_BASE}/user/avatar`, {
        method: "POST",
        headers: this.getHeaders(),
        credentials: "include",
        body: formData,
      });
      const res = await resp.json();
      if (!resp.ok) throw new Error(res.error?.message || "Failed to upload avatar");
      if (res.success && res.data?.avatar_url) {
        this.user = { ...this.user, avatarUrl: res.data.avatar_url } as UserDto;
        storage.setUser(this.user);
      }
      return res;
    } catch (e: unknown) {
      console.error("Avatar upload error", e);
      throw e;
    }
  }

  /** Simulate Pro upgrade */
  async upgradeToPro() {
    this.loading = true;
    try {
      const resp = await fetch(`${API_BASE}/auth/upgrade-pro`, {
        method: "POST",
        headers: this.getHeaders(),
        credentials: "include",
      });

      if (!resp.ok) {
        throw await ApiError.fromResponse(resp);
      }

      const res = await resp.json();
      if (res.success && res.data) {
        this.user = { ...this.user, ...res.data } as UserDto;
        storage.setUser(this.user);
      }
      return res;
    } catch (e: unknown) {
      ApiError.handleRateLimit(e);
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
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: this.getHeaders(true),
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response);
      }

      const res = await response.json();
      return { success: true, message: res.data?.message };
    } catch (e) {
      if (!ApiError.handleRateLimit(e)) {
        this.error = e instanceof ApiError ? e.message : "Network error occurred";
      } else {
        this.error = "Too many attempts. Please wait.";
      }
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
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: this.getHeaders(true),
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response);
      }

      const res = await response.json();
      return { success: true, message: res.data?.message };
    } catch (e) {
      if (!ApiError.handleRateLimit(e)) {
        this.error = e instanceof ApiError ? e.message : "Network error occurred";
      } else {
        this.error = "Too many attempts. Please wait.";
      }
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
      const response = await fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response);
      }

      const res = await response.json();

      // Update local user state if logged in
      if (this.user) {
        this.user = { ...this.user, isEmailVerified: true } as UserDto;
        storage.setUser(this.user);
      }

      return { success: true, message: res.data?.message };
    } catch (e) {
      this.error = e instanceof ApiError ? e.message : "Verification failed";
      return { success: false };
    } finally {
      this.loading = false;
    }
  }

  /** Resend verification email (authenticated) */
  async resendVerification(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: this.getHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response);
      }

      return true;
    } catch (e) {
      ApiError.handleRateLimit(e, "Please wait before requesting another verification email.");
      console.error("Resend verification error", e);
      return false;
    }
  }
  /** Helper to get headers with optional JSON content-type and auth token */
  private getHeaders(json = false): Record<string, string> {
    const headers: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }
}

export const authStore = new AuthStore();
