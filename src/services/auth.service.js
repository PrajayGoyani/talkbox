import User from '../models/user.model.js';
import { generateTokens, verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

class AuthService {
    async signup({ name, email, password }) {
        const existingUser = await User.exists({ email });
        if (existingUser) {
            throw AppError.conflict('User already exists', 'USER_EXISTS');
        }

        const user = await User.create({ name, email, password });
        const tokens = generateTokens(user.toObject());

        return {
            user: this.sanitize(user),
            ...tokens,
        };
    }

    async login({ email, password }) {
        const user = await User.findOne({ email });
        if (!user) {
            throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
        }
    
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
        }

        user.lastSeen = new Date();
        await user.save();
        
        const tokens = generateTokens(user.toObject());
        return {
            user: this.sanitize(user), 
            ...tokens
        };
    }

    async refresh(refreshToken) {
        if (!refreshToken) {
            throw AppError.unauthorized('Refresh token required', 'TOKEN_REQUIRED');
        }
        
        try {
            const payload = verifyAccessToken(refreshToken);

            const user = await User.findById(payload.id);
            if (!user) throw AppError.unauthorized('Invalid user', 'INVALID_USER');
            const tokens = generateTokens(user);

            return { ...tokens };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw AppError.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
        }
    }

    async getMe(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) throw AppError.notFound('User');
        return user;
    }

    sanitize(user) {
        return {
            id: user._id,
            name: user.name,
            email: user.email,
        };
    }


}

export const authService = new AuthService();