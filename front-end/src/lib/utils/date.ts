/** 
 * Format a timestamp for chat listing: 
 * - 'HH:MM' if today
 * - 'Yesterday' if yesterday
 * - Day name (e.g. 'Mon') if within a week
 * - Date (e.g. '12 Jan') if older
 */
export function formatListTime(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) {
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (isYesterday) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** 
 * Relative time formatter for notifications 
 * (e.g. '5m ago', '2h ago')
 */
export function formatTimeAgo(date: string | Date): string {
  if (!date) return '';
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  
  if (mins < 1) return 'Just now';
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
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get a human-readable date label for chat history dividers
 * (e.g. 'Today', 'Yesterday', '12 Jan', '12 Jan 2024')
 */
export function getDateLabel(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}
