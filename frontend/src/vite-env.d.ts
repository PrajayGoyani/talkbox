/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ALLOW_UPGRADES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
