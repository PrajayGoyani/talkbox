import { defineConfig } from "vite-plus";

// https://viteplus.dev/config/
export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
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
