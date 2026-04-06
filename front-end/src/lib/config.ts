/**
 * Single source of truth for API configuration.
 *
 * - localhost  → http://localhost:3000
 * - any other  → http://<current_host>/api  (assumes a reverse-proxy on port 80/443)
 */

const getBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:3000'; // SSR fallback

  const { hostname } = window.location;
  // render specific check
  if (hostname.startsWith('user-chat')) {
    return 'https://user-chat-rg8u.onrender.com'
  }
  // if (hostname === 'localhost' || hostname === '127.0.0.1') {
  //   return 'http://localhost:3000';
  // }
  return `http://${hostname}:3000`;
};

/** Root server URL – use for WebSocket connections */
export const API_ROOT = getBaseUrl();

// console.log({ API_ROOT });

/** REST API base – use for fetch calls */
export const API_BASE = `${API_ROOT}/api`;
