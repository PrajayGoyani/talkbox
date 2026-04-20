import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

// https://viteplus.dev/config/
export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: {
      $lib: "/src/lib",
      $components: "/src/lib/components",
      $state: "/src/lib/state",
      $utils: "/src/lib/utils",
      $types: "/src/lib/types",
      $assets: "/src/assets",
      "@": "/src",
    },
  },
  run: { cache: true },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    printWidth: 120,
    ignorePatterns: ["routeTree.gen.ts", "docs/changelog/index.mdx", "dist/**"],
    sortPackageJson: {
      sortScripts: true,
    },
    sortTailwindcss: {
      stylesheet: "./src/app.css",
      functions: ["clsx", "cva", "cn"],
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
});
