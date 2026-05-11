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
