import { resolve } from "node:path";
import { defineConfig } from "vite-plus";

// https://viteplus.dev/config/
export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@controllers": resolve(__dirname, "./src/controllers"),
      "@services": resolve(__dirname, "./src/services"),
      "@models": resolve(__dirname, "./src/models"),
      "@middlewares": resolve(__dirname, "./src/middlewares"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@schemas": resolve(__dirname, "./src/schemas"),
      "@config": resolve(__dirname, "./src/config"),
      "@bootstrap": resolve(__dirname, "./src/bootstrap"),
      "@routes": resolve(__dirname, "./src/routes"),
      "@jobs": resolve(__dirname, "./src/jobs"),
      "@repositories": resolve(__dirname, "./src/repositories"),
      "@constants": resolve(__dirname, "./src/constants"),
    },
  },

  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test-setup.ts"],
    silent: true,
  },
});
