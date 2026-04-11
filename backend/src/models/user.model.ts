import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";

import { BCRYPT_SALT } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export interface IUser extends Document {
  username: string;
  name: string | null;
  email: string;
  password?: string;
  avatar_url: string | null;
  lastSeen: Date;
  
  // Virtuals
  avatarUrl: string;

  // Methods
  comparePassword(password: string): Promise<boolean>;
  hashPassword(): Promise<void>;
}

export interface IUserModel extends Model<IUser> {
  findByEmailOrUsername(username: string): Promise<IUser | null>;
  isUsername(input: string): boolean;
  isEmail(input: string): boolean;
}

const userSchema = new Schema<IUser, IUserModel>({
  username: { type: String, required: true, unique: true, trim: true },
  name: { type: String, default: null, trim: true, maxlength: 50, index: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar_url: { type: String, default: null },
  lastSeen: { type: Date, default: Date.now },
});

userSchema.virtual("avatarUrl").get(function (this: IUser) {
  return (
    this.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.username || this.email)}`
  );
});

userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password!);
};

userSchema.methods.hashPassword = async function () {
  const hash = await bcrypt.hash(this.password!, BCRYPT_SALT);
  this.password = hash;
};

userSchema.statics.findByEmailOrUsername = function (username: string) {
  if (this.isEmail(username)) {
    return this.findOne({ email: username });
  }

  if (this.isUsername(username)) {
    return this.findOne({ username });
  }

  throw AppError.badRequest("Invalid username or email", "INVALID_USERNAME_OR_EMAIL");
};

userSchema.statics.isUsername = function (input: string) {
  const usernameRegex = /^[a-zA-Z0-9]{3,30}$/;
  return usernameRegex.test(input);
};

userSchema.statics.isEmail = function (input: string) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(input);
};

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    await this.hashPassword();
  }
});

const User = mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;
