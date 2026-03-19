import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

import { BCRYPT_SALT } from '../config/env.js';

const userSchema = new Schema({
    name: { type: String, default: null, trim: true },
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
        return this.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name || this.email)}`;
    }

    async comparePassword(password) {
        return bcrypt.compare(password, this.password);
    }

    async hashPassword() {
        const hash = await bcrypt.hash(this.password, BCRYPT_SALT);
        this.password = hash;
    }

    static findByEmail(email) {
        return this.findOne({ email });
    }
});

userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        await this.hashPassword();
    }
});

const User = mongoose.model('User', userSchema);

export default User;