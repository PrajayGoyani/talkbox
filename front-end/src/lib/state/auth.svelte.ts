import { type UserDto, type AuthResponseDto, type LoginRequestDto, type SignupRequestDto, type ApiResponse } from '../types/auth.dto';
import { API_BASE } from '../config';

// Access tokens expire in 15min typically; refresh 1 min before
const REFRESH_INTERVAL_MS = 14 * 60 * 1000;

class AuthStore {
  user: UserDto | null = $state(null);
  accessToken: string | null = $state(null);
  isCheckingAuth: boolean = $state(true);
  error: string | null = $state(null);
  loading: boolean = $state(false);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;

    // Try silent refresh first (HttpOnly cookie may have a valid refresh token)
    const refreshed = await this.silentRefresh();
    
    if (!refreshed) {
      // Fallback: check localStorage for cached session 
      const storedUser = localStorage.getItem('auth_user');
      const storedToken = localStorage.getItem('auth_token');
      if (storedUser && storedToken) {
        try {
          this.user = JSON.parse(storedUser);
          this.accessToken = storedToken;
          this.scheduleRefresh();
        } catch (e) {
          console.error('Failed to parse stored auth data', e);
          this.clearAuth();
        }
      }
    }
    this.isCheckingAuth = false;
  }

  /**
   * Silent refresh: POST to /auth/refresh with credentials (HttpOnly cookie).
   * On success: updates accessToken.
   * Returns true if refresh succeeded.
   */
  async silentRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) return false;
      
      const res = await response.json();
      if (res.success && res.data?.accessToken) {
        this.accessToken = res.data.accessToken;
        localStorage.setItem('auth_token', res.data.accessToken);
        
        // If we have cached user data, keep it; otherwise fetch /me
        if (!this.user) {
          const storedUser = localStorage.getItem('auth_user');
          if (storedUser) {
            this.user = JSON.parse(storedUser);
          } else {
            await this.fetchMe();
          }
        }
        
        this.scheduleRefresh();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /** Fetch user profile using current accessToken */
  private async fetchMe() {
    try {
      const resp = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        credentials: 'include'
      });
      if (!resp.ok) return;
      const res = await resp.json();
      if (res.success && res.data) {
        this.user = res.data;
        localStorage.setItem('auth_user', JSON.stringify(res.data));
      }
    } catch (e) {
      console.error('Failed to fetch user profile', e);
    }
  }

  /** Schedule next silent refresh before token expires */
  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.silentRefresh();
    }, REFRESH_INTERVAL_MS);
  }

  async login(credentials: LoginRequestDto) {
    this.loading = true;
    this.error = null;
    const start = Date.now();
    let pendingError: string | null = null;
    let success = false;
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const res: ApiResponse<AuthResponseDto> = await response.json();

      if (res.success) {
        this.setAuth(res.data);
        success = true;
      } else {
        pendingError = res.error?.message || 'Login failed';
      }
    } catch (e) {
      pendingError = 'Network error occurred';
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise(r => setTimeout(r, 500 - elapsed));
      }
      this.error = pendingError;
      this.loading = false;
    }
    return success;
  }

  async signup(data: SignupRequestDto) {
    this.loading = true;
    this.error = null;
    const start = Date.now();
    let pendingError: string | null = null;
    let success = false;
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const res: ApiResponse<AuthResponseDto> = await response.json();

      if (res.success) {
        this.setAuth(res.data);
        success = true;
      } else {
        pendingError = res.error?.message || 'Signup failed';
      }
    } catch (e) {
      pendingError = 'Network error occurred';
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise(r => setTimeout(r, 500 - elapsed));
      }
      this.error = pendingError;
      this.loading = false;
    }
    return success;
  }

  async logout() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    try {
      if (typeof window !== 'undefined') {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
      }
    } catch (e) {
      console.error('Logout error', e);
    }
    this.clearAuth();
  }

  private clearAuth() {
    this.user = null;
    this.accessToken = null;
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
  }

  private setAuth(data: AuthResponseDto) {
    this.user = data.user;
    this.accessToken = data.accessToken;
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    localStorage.setItem('auth_token', data.accessToken);
    this.scheduleRefresh();
  }
}

export const authStore = new AuthStore();
