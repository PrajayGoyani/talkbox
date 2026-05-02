import { USERNAME_REGEX } from "shared/constants/validation";

export const isValidUsername = (username: string): boolean => USERNAME_REGEX.test(username);
