import { authService } from '../services/auth.service.js';
import { success } from '../utils/response.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true, 
    sameSite: 'None', 
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    path: '/',
    partitioned: true // CHIPS: Required for cross-site cookies in modern browsers
};

// Use Lax for local development if not on HTTPS
if (process.env.NODE_ENV === 'development') {
    COOKIE_OPTIONS.secure = false;
    COOKIE_OPTIONS.sameSite = 'Lax';
    COOKIE_OPTIONS.partitioned = false;
}

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
    
    