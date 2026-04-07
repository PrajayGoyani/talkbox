import type { UserDto } from '../types/auth.dto';

const IS_BROWSER = typeof window !== 'undefined';

export type Theme = "light" | "dark";

export const storage = {
  getTheme: (): Theme => (IS_BROWSER ? (localStorage.getItem('theme') as Theme) || 'dark' : 'dark'),
  setTheme: (theme: Theme) => {
    if (IS_BROWSER) localStorage.setItem('theme', theme);
  },
  
  getUser: (): UserDto | null => {
    if (!IS_BROWSER) return null;
    const data = localStorage.getItem('auth_user');
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: UserDto | null) => {
    if (IS_BROWSER) {
      if (user) localStorage.setItem('auth_user', JSON.stringify(user));
      else localStorage.removeItem('auth_user');
    }
  },
  
  clearAuth: () => {
    if (IS_BROWSER) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_refresh_token');
    }
  }
};
