/**
 * Cache for Intl.DateTimeFormat instances to avoid expensive re-creation
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat(undefined, options));
  }
  return formatterCache.get(key)!;
}

/**
 * Cache for date labels to avoid repeated calculations during list renders
 */
const labelCache = new Map<string, string>();
let lastCacheClear = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Format a timestamp for chat listing:
 * - 'HH:MM' if today
 * - 'Yesterday' if yesterday
 * - Day name (e.g. 'Mon') if within a week
 * - Date (e.g. '12 Jan') if older
 */
export function formatListTime(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return getFormatter({
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isYesterday) return "Yesterday";

  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return getFormatter({ weekday: "short" }).format(d);
  }

  return getFormatter({ day: "numeric", month: "short" }).format(d);
}

/**
 * Relative time formatter for notifications
 * (e.g. '5m ago', '2h ago')
 */
export function formatTimeAgo(date: string | Date): string {
  if (!date) return "";
  const timestamp = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Format a timestamp for chat bubble: 'HH:MM AM/PM'
 */
export function formatSimpleTime(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return getFormatter({
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Get a human-readable date label for chat history dividers
 * (e.g. 'Today', 'Yesterday', '12 Jan', '12 Jan 2024')
 */
export function getDateLabel(date: string | Date): string {
  if (!date) return "";
  const dateStr = typeof date === "string" ? date : date.toISOString();
  // Using the full date string as key is fine, but we only really care about the date part for the label
  const cacheKey = dateStr.slice(0, 10);

  // Clear cache occasionally to handle "Today" becoming "Yesterday"
  const nowTs = Date.now();
  if (nowTs - lastCacheClear > CACHE_TTL) {
    labelCache.clear();
    lastCacheClear = nowTs;
  }

  if (labelCache.has(cacheKey)) {
    return labelCache.get(cacheKey)!;
  }

  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateToCompare = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round((today.getTime() - dateToCompare.getTime()) / (1000 * 60 * 60 * 24));

  let label = "";
  if (diffDays === 0) {
    label = "Today";
  } else if (diffDays === 1) {
    label = "Yesterday";
  } else {
    label = getFormatter({
      day: "numeric",
      month: "long",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(d);
  }

  labelCache.set(cacheKey, label);
  return label;
}
