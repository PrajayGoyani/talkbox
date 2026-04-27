export const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,30}$/;
export const USERNAME_ERROR = "Username must be 3-30 characters (alphanumeric, underscores, or periods)";

export const isValidUsername = (username: string) => USERNAME_REGEX.test(username);
