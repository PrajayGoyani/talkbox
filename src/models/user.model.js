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

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    const hash = await bcrypt.hash(this.password, BCRYPT_SALT);
    this.password = hash;
});

const User = mongoose.model('User', userSchema);

export default User;