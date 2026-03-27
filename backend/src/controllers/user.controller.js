import { userService } from '../services/user.service.js';
import { success } from '../utils/response.js';

export const uploadAvatar = async (req, res) => {
    // TODO: Add logic to upload avatar
    const result = await userService.uploadAvatar(req.user.id, req.file);
    res.json(success(result));
};

export const getMe = async (req, res) => {
    const user = await userService.getMe(req.user.id);
    res.json(success(user));
};

export const updateProfile = async (req, res) => {
    // TODO: Add logic to update user profile along with avatar image
    const result = await userService.updateProfile(req.user.id, req.body);
    res.json(success(result));
};

export const searchByUsername = async (req, res) => {
    const user = await userService.searchByUsername(req.query.username);
    res.json(success(user));
};
