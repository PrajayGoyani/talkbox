import { USERNAME_REGEX } from "../constants/validation.js";

export const isValidUsername = (username: string): boolean => USERNAME_REGEX.test(username);
