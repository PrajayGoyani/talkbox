import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
// Note: keep this code
// import { compression } from "vite-plugin-compression2";
import { defineConfig } from "vite-plus";

// https://viteplus.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [
      tailwindcss(),
      svelte({
        compilerOptions: {
          discloseVersion: false,
        },
        // inspector: true,
      }),
      // Note: keep this code
      // compression({ algorithm: "gzip", exclude: [/\.(br)$/, /\.(gz)$/] }),
      // compression({ algorithm: "brotliCompress", exclude: [/\.(br)$/, /\.(gz)$/] }),
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

    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
        },
        "/uploads": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
