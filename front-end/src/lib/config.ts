/**
 * Single source of truth for API configuration.
 *
 * - localhost  → http://localhost:3000
 * - any other  → http://<current_host>/api  (assumes a reverse-proxy on port 80/443)
 */

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (typeof window === 'undefined') return 'http://localhost:3000'; // SSR fallback

  const { hostname, protocol } = window.location;
  // Use http for localhost:3000 if not on prod, or use current protocol for prod
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const port = isLocal ? ':3000' : '';
  
  return `${protocol}//${hostname}${port}`;
};

/** Root server URL – use for WebSocket connections */
export const API_ROOT = getBaseUrl();

/** REST API base – use for fetch calls */
export const API_BASE = `${API_ROOT}/api`;

// --- Shared Constants ---

/** Duration for typing indicators to show before auto-clearing (ms) */
export const TYPING_INDICATOR_DURATION = 3500;

/** Debounce duration for emitting typing status (ms) */
export const TYPING_DEBOUNCE_DURATION = 2000;

/** Fallback timeout for message sending if no response from server (ms) */
export const MESSAGE_SEND_FALLBACK_TIMEOUT = 10000;

/** Default asset paths */
export const ASSETS = {
  NOTIFICATION_ICON: '/vite.svg',
  LOGO: '/favicon.png'
};
