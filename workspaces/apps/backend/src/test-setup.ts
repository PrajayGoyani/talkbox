// Polyfill Bun for tests running in Node environment
const isNode = typeof Bun === "undefined";

if (isNode) {
  const nodeCrypto = require("node:crypto");

  // Provide a minimal Bun mock for Node environment
  (globalThis as any).Bun = {
    env: process.env,
    hash: (data: string | Buffer | Uint8Array) => {
      // Simple mock hash for tests
      let hash = 0n;
      const str = data.toString();
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5n) - hash + BigInt(str.charCodeAt(i));
      }
      return hash;
    },
    password: {
      hash: async (pw: string) => `$argon2id$v=19$m=65536,t=2,p=1$mockhash${pw}`,
      verify: async (pw: string, hash: string) => hash.includes(pw),
    },
  };

  // Ensure Web Crypto API is available globally in Node
  if (!globalThis.crypto) {
    (globalThis as any).crypto = nodeCrypto.webcrypto || nodeCrypto;
  }
}

// Mock environment variables required by @config/env
// Bun.env.ALLOWED_ORIGINS = "*";
// Bun.env.JWT_SECRET_KEY = "test_secret";
// Bun.env.JWT_REFRESH_SECRET_KEY = "test_refresh_secret";
// Bun.env.MONGO_URI = "mongodb://localhost:27017/test";
// Bun.env.NODE_ENV = "test";
// Bun.env.JWT_EXPIRATION = "1h";
// Bun.env.JWT_REFRESH_EXPIRATION = "7d";
// Bun.env.UPLOAD_STRATEGY = "local";

/*
// Mute specific DeprecationWarnings (e.g. url.parse() from dependencies)
const originalEmit = process.emit;
// @ts-ignore
process.emit = function (name: string, data: any) {
  if (
    name === "warning" &&
    data &&
    data.name === "DeprecationWarning" &&
    data.message?.includes("url.parse")
  ) {
    return false;
  }
  // @ts-ignore
  return originalEmit.apply(process, arguments);
};
*/

const bunEnv = (globalThis as any).Bun.env;

bunEnv.ALLOWED_ORIGINS = "*";
bunEnv.JWT_SECRET_KEY = "test_secret";
bunEnv.JWT_REFRESH_SECRET_KEY = "test_refresh_secret";
bunEnv.MONGO_URI = "mongodb://localhost:27017/test";
bunEnv.NODE_ENV = "test";
bunEnv.JWT_EXPIRATION = "1h";
bunEnv.JWT_REFRESH_EXPIRATION = "7d";
bunEnv.UPLOAD_STRATEGY = "local";
bunEnv.DEMO_PASSWORD = "password123";
