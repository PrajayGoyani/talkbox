import { authService } from '../services/auth.service.js';
import { success } from '../utils/response.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'None', // Lax
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const signup = async (req, res) => {
    const result = await authService.signup(req.body);
    
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
    delete result.refreshToken;
    
    res.json(success(result));
};

export const login = async (req, res) => {  
    const result = await authService.login(req.body);

    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
    delete result.refreshToken;

    res.json(success(result));
};

export const logout = async (req, res) => {
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.json(success({ message: 'Logged out successfully' }));
};


export const refresh = async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    const result = await authService.refresh(refreshToken);
    res.json(success(result));
}

export const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json(success(user));
};
    
    