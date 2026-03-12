import mongoose, { Schema } from 'mongoose';

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
    avatar_url: { type: String, default: null }
});

const User = mongoose.model('User', userSchema);

export default User;