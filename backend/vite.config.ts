import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite-plus";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://viteplus.dev/config/
export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
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
      "@shared": resolve(__dirname, "../shared"),
    },
  },
  fmt: {
    printWidth: 120,
    ignorePatterns: ["dist/**", "node_modules/**"],
    sortPackageJson: {
      sortScripts: true,
    },
    sortImports: {
      groups: [
        "type-import",
        ["value-builtin", "value-external"],
        "type-internal",
        "value-internal",
        ["type-parent", "type-sibling", "type-index"],
        ["value-parent", "value-sibling", "value-index"],
        "unknown",
      ],
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test-setup.ts"],
  },
});
