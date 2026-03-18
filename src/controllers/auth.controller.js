import { authService } from '../services/auth.service.js';
import { success } from '../utils/response.js';

export const signup = async (req, res) => {
    const result = await authService.signup(req.body);
    res.json(success(result));
};

export const login = async (req, res) => {  
    const result = await authService.login(req.body);

    /* res.cookie('jwt', refreshToken, {
        httpOnly: true,
        sameSite: 'None', secure: true,
        maxAge: 24 * 60 * 60 * 1000
    }) */;

    res.json(success(result));
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
    
    