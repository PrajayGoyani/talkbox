import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lint = JSON.parse(readFileSync(resolve(__dirname, "oxlint.json"), "utf-8"));
const fmt = JSON.parse(readFileSync(resolve(__dirname, "oxfmt.json"), "utf-8"));

export default defineConfig({
  lint,
  fmt,
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/dist/**", "**/node_modules/**"],
    setupFiles: ["workspaces/apps/backend/src/test-setup.ts"],
  },
  resolve: {
    alias: {
      // Backend aliases
      "@": resolve(__dirname, "workspaces/apps/backend/src"),
      "@controllers": resolve(__dirname, "workspaces/apps/backend/src/controllers"),
      "@services": resolve(__dirname, "workspaces/apps/backend/src/services"),
      "@models": resolve(__dirname, "workspaces/apps/backend/src/models"),
      "@middlewares": resolve(__dirname, "workspaces/apps/backend/src/middlewares"),
      "@utils": resolve(__dirname, "workspaces/apps/backend/src/utils"),
      "@schemas": resolve(__dirname, "workspaces/apps/backend/src/schemas"),
      "@config": resolve(__dirname, "workspaces/apps/backend/src/config"),
      "@bootstrap": resolve(__dirname, "workspaces/apps/backend/src/bootstrap"),
      "@routes": resolve(__dirname, "workspaces/apps/backend/src/routes"),
      "@jobs": resolve(__dirname, "workspaces/apps/backend/src/jobs"),
      "@repositories": resolve(__dirname, "workspaces/apps/backend/src/repositories"),
      "@constants": resolve(__dirname, "workspaces/apps/backend/src/constants"),
      // Frontend aliases
      $lib: resolve(__dirname, "workspaces/apps/frontend/src/lib"),
      $components: resolve(__dirname, "workspaces/apps/frontend/src/lib/components"),
      $state: resolve(__dirname, "workspaces/apps/frontend/src/lib/state"),
      $utils: resolve(__dirname, "workspaces/apps/frontend/src/lib/utils"),
      $types: resolve(__dirname, "workspaces/apps/frontend/src/lib/types"),
      $services: resolve(__dirname, "workspaces/apps/frontend/src/lib/services"),
      $assets: resolve(__dirname, "workspaces/apps/frontend/src/assets"),
    },
  },
  run: {
    cache: {
      tasks: true,
    },
    tasks: {
      "fmt:all": {
        command: "vp fmt && bun x prettier --write '**/*.svelte' --ignore-path .gitignore",
      },
      "check:all": {
        command: "vp check && bun x prettier --check '**/*.svelte' --ignore-path .gitignore",
      },
    },
  },
});
