import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { compression } from "vite-plugin-compression2";
import { defineConfig } from "vite-plus";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://viteplus.dev/config/
export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        discloseVersion: false,
      },
    }),
    compression({ algorithm: "gzip", exclude: [/\.(br)$/, /\.(gz)$/] }),
    compression({ algorithm: "brotliCompress", exclude: [/\.(br)$/, /\.(gz)$/] }),
  ],
  resolve: {
    alias: {
      $lib: "/src/lib",
      $components: "/src/lib/components",
      $state: "/src/lib/state",
      $utils: "/src/lib/utils",
      $types: "/src/lib/types",
      $services: "/src/lib/services",
      $assets: "/src/assets",
      "@": "/src",
      "@shared": resolve(__dirname, "../shared"),
    },
  },
  run: {
    tasks: {
      "build-task": {
        command: "vp build",
        input: ["src/**/*", "public/**/*", "package.json", "vite.config.ts", "tsconfig.app.json"],
      },
    },
  },

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
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
