import { defineConfig } from "vite-plus";

// https://viteplus.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
      "@controllers": "/src/controllers",
      "@services": "/src/services",
      "@models": "/src/models",
      "@middlewares": "/src/middlewares",
      "@utils": "/src/utils",
      "@schemas": "/src/schemas",
      "@config": "/src/config",
      "@bootstrap": "/src/bootstrap",
      "@routes": "/src/routes",
      "@jobs": "/src/jobs",
      "@repositories": "/src/repositories",
      "@constants": "/src/constants",
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
