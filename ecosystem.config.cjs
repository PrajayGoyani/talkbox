const IS_DEV = process.env.APP_MODE === "dev";

module.exports = {
  apps: [
    {
      name: "chat-app-backend",
      cwd: "./workspaces/apps/backend",
      script: "bun",
      args: IS_DEV ? "run dev" : "run start",
      // watch: IS_DEV,
      env: {
        NODE_ENV: IS_DEV ? "development" : "production",
      },
    },
    {
      name: "chat-app-frontend",
      cwd: "./workspaces/apps/frontend",
      script: "bun",
      args: IS_DEV ? "run dev --host" : "run preview",
      env: {
        NODE_ENV: IS_DEV ? "development" : "production",
      },
    },
  ],
};
