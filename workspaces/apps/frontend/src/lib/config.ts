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
  const { hostname } = window.location;
  const isLocal = isLocalhost(hostname);

  // If we are local, we use relative paths to let the Vite proxy handle it.
  // This avoids CORS and SameSite cookie issues.
  if (isLocal) return "";

  // Production fallback: assume API is on the same host but under /api
  return "";
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
export const API_BASE = API_ROOT ? `${API_ROOT}/api` : "/api";

/** Set to false in .env to disable the Pro upgrade process across the platform */
export const ALLOW_UPGRADES = getBoolEnv("VITE_ALLOW_UPGRADES", false);

/** Whether to show engaging quotes and animations during slow boot */
export const SHOW_ENGAGING_LOADER = getBoolEnv("VITE_SHOW_ENGAGING_LOADER", true);

/** Whether to show debug/testing settings in the UI */
export const SHOW_DEBUG_SETTINGS = getBoolEnv("VITE_SHOW_DEBUG_SETTINGS", false);

// --- Shared Constants ---

/** Duration for typing indicators to show before auto-clearing (ms) */
export const TYPING_INDICATOR_DURATION = 3500;

/** Debounce duration for emitting typing status (ms) */
export const TYPING_DEBOUNCE_DURATION = 2000;

/** Fallback timeout for message sending if no response from server (ms) */
export const MESSAGE_SEND_FALLBACK_TIMEOUT = 10000;

/** Timeout for client-side optimistic message failure (ms) */
export const MESSAGE_ACK_TIMEOUT = 15000;

/** Minimum time to show message loader for a smoother transition (ms) */
export const MESSAGE_LOADER_AWAIT_MS = 300;

/** Default asset paths */
export const ASSETS = {
  NOTIFICATION_ICON: "/vite.svg",
  LOGO: "/favicon.png",
};
// --- UI Constants ---

/** Approximate height of a message skeleton for layout calculation (px) */
export const MESSAGE_SKELETON_HEIGHT = 90;

/** Debounce duration for chat list search (ms) */
export const CHAT_SEARCH_DEBOUNCE = 300;

/** Throttle duration for scroll events (ms) */
export const SCROLL_THROTTLE_DURATION = 100;
