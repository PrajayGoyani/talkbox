import { type UserDto, type AuthResponseDto, type LoginRequestDto, type SignupRequestDto, type ApiResponse } from '../types/auth.dto';

const API_BASE = 'http://localhost:3000/api';

export class AuthStore {
  user: UserDto | null = $state(null);
  accessToken: string | null = $state(null);
  isCheckingAuth: boolean = $state(true);
  error: string | null = $state(null);
  loading: boolean = $state(false);

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');

    if (storedUser && storedToken) {
      try {
        this.user = JSON.parse(storedUser);
        this.accessToken = storedToken;
      } catch (e) {
        console.error('Failed to parse stored auth data', e);
        this.logout();
      }
    }
    this.isCheckingAuth = false;
  }

  async login(credentials: LoginRequestDto) {
    this.loading = true;
    this.error = null;
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const res: ApiResponse<AuthResponseDto> = await response.json();

      if (res.success) {
        this.setAuth(res.data);
        return true;
      } else {
        this.error = res.error?.message || 'Login failed';
        return false;
      }
    } catch (e) {
      this.error = 'Network error occurred';
      return false;
    } finally {
      this.loading = false;
    }
  }

  async signup(data: SignupRequestDto) {
    this.loading = true;
    this.error = null;
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const res: ApiResponse<AuthResponseDto> = await response.json();

      if (res.success) {
        this.setAuth(res.data);
        return true;
      } else {
        this.error = res.error?.message || 'Signup failed';
        return false;
      }
    } catch (e) {
      this.error = 'Network error occurred';
      return false;
    } finally {
      this.loading = false;
    }
  }

  logout() {
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
    if (data.refreshToken) {
        localStorage.setItem('auth_refresh_token', data.refreshToken);
    }
  }
}

export const authStore = new AuthStore();
