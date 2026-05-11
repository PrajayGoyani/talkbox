import { BASE_URL, BCRYPT_SALT } from "@config/env";
import { AppError } from "@utils/AppError";
import bcrypt from "bcryptjs";
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  name: string | null;
  email: string;
  password?: string;
  avatar_url: string | null;
  lastSeen: Date;
  plan: "free" | "pro";
  subscriptionExpiresAt: Date | null;
  isEmailVerified: boolean;
  bio: string | null;

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
  plan: { type: String, enum: ["free", "pro"], default: "free" },
  subscriptionExpiresAt: { type: Date, default: null },
  isEmailVerified: { type: Boolean, default: false },
  bio: { type: String, default: null, maxlength: 200, trim: true },
});

// Compound index helps efficient background jobs for downgrading expired 'pro' accounts
userSchema.index({ plan: 1, subscriptionExpiresAt: 1 });

userSchema.virtual("avatarUrl").get(function (this: IUser) {
  if (this.avatar_url) {
    if (!this.avatar_url.startsWith("http")) {
      return `${BASE_URL}${this.avatar_url}`;
    }
    return this.avatar_url;
  }
  const slug: string = this.username;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(slug.substring(0, 2))}`;
});

userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password!);
};

/**
 * Hashes the user's password using bcryptjs.
 * NOTE: We use bcryptjs for its portability and to avoid native binary issues/warnings.
 * If the app scales to thousands of concurrent logins, consider switching to Argon2
 * or using the native 'Bun.password' API for maximum performance.
 */
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
