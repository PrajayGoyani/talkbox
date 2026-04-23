const isLocalhost = (hostname: string) => {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.")) {
    return true;
  }
  return false;
};

/**
 * Single source of truth for API configuration.
 *
 * - localhost  → http://localhost:3000
 * - any other  → http://<current_host>/api  (assumes a reverse-proxy on port 80/443)
 */

// --- Environment Variables ---

const getBaseUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:3000";
  const { hostname, protocol } = window.location;
  const isLocal = isLocalhost(hostname);
  const port = isLocal ? ":3000" : "";
  return `${protocol}//${hostname}${port}`;
};

const getEnv = (key: string, fallback: string = ""): string => {
  return import.meta.env[key] ?? fallback;
};

const getBoolEnv = (key: string, fallback: boolean = true): boolean => {
  const val = import.meta.env[key];
  if (val === undefined) return fallback;
  return val !== "false";
};

/** Root server URL – use for WebSocket connections */
export const API_ROOT = getEnv("VITE_API_URL") || getBaseUrl();

/** REST API base – use for fetch calls */
export const API_BASE = `${API_ROOT}/api`;

/** Set to false in .env to disable the Pro upgrade process across the platform */
export const ALLOW_UPGRADES = getBoolEnv("VITE_ALLOW_UPGRADES", false);

// --- Shared Constants ---

/** Duration for typing indicators to show before auto-clearing (ms) */
export const TYPING_INDICATOR_DURATION = 3500;

/** Debounce duration for emitting typing status (ms) */
export const TYPING_DEBOUNCE_DURATION = 2000;

/** Fallback timeout for message sending if no response from server (ms) */
export const MESSAGE_SEND_FALLBACK_TIMEOUT = 10000;

/** Default asset paths */
export const ASSETS = {
  NOTIFICATION_ICON: "/vite.svg",
  LOGO: "/favicon.png",
};
