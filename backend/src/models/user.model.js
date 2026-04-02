import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

import { BCRYPT_SALT } from '../config/env.js';
import z from 'zod';
import { AppError } from '../utils/AppError.js';

const userSchema = new Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatar_url: { type: String, default: null },
    lastSeen: { type: Date, default: Date.now },
});

userSchema.loadClass(class {
    get avatarUrl() {
        return this.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.username || this.email)}`;
    }

    async comparePassword(password) {
        return bcrypt.compare(password, this.password);
    }

    async hashPassword() {
        const hash = await bcrypt.hash(this.password, BCRYPT_SALT);
        this.password = hash;
    }

    static findByEmailorUsername(username) {

        if (this.isEmail(username)) {
            return this.findOne({ email: username });
        }

        if (this.isUsername(username)) {
            return this.findOne({ username });
        }

        throw AppError.badRequest('Invalid username or email', 'INVALID_USERNAME_OR_EMAIL');
    }

    static isUsername(input) {
        const usernameRegex = /^[a-zA-Z0-9]{3,30}$/;
        return usernameRegex.test(input);
    }

    static isEmail(input) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(input);
    }
});

userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        await this.hashPassword();
    }
});

const User = mongoose.model('User', userSchema);

export default User;