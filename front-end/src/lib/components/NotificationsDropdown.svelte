<script lang="ts">
  import { authStore } from '../state/auth.svelte';
  import { chatStore } from '../state/chat.svelte';
  import { onMount } from 'svelte';
  import { API_BASE } from '../config';

  const { onNavigate } = $props<{
    onNavigate: (type: string, referenceId: string) => void;
  }>();

  let isOpen = $state(false);
  let notifications: Array<any> = $state([]);
  let unreadCount = $state(0);
  let loading = $state(false);
  let skip = $state(0);
  let hasMore = $state(true);
  const LIMIT = 15;

  const fetchNotifications = async (reset = false) => {
    if (loading) return;
    loading = true;
    const currentSkip = reset ? 0 : skip;
    try {
      const resp = await fetch(`${API_BASE}/notifications?limit=${LIMIT}&skip=${currentSkip}`, {
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      if (!resp.ok) throw new Error('Failed to load notifications');
      const result = await resp.json();
      const data = result.data;
      if (reset) {
        notifications = data.notifications;
        skip = data.notifications.length;
      } else {
        notifications = [...notifications, ...data.notifications];
        skip += data.notifications.length;
      }
      unreadCount = data.unreadCount;
      hasMore = data.notifications.length === LIMIT;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      notifications = notifications.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      );
      unreadCount = Math.max(0, unreadCount - 1);
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      notifications = notifications.map(n => ({ ...n, isRead: true }));
      unreadCount = 0;
    } catch (e) { console.error(e); }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) markAsRead(notification._id);
    onNavigate(notification.type, notification.referenceId);
    isOpen = false;
  };

  const toggleDrawer = () => {
    isOpen = !isOpen;
    if (isOpen) fetchNotifications(true);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'chat_request': return '📩';
      case 'request_accepted': return '✅';
      case 'request_rejected': return '❌';
      case 'new_message': return '💬';
      default: return '🔔';
    }
  };

  const getLabel = (type: string) => {
    switch(type) {
      case 'chat_request': return 'Chat Request';
      case 'request_accepted': return 'Request Accepted';
      case 'request_rejected': return 'Request Declined';
      case 'new_message': return 'New Message';
      default: return 'Notification';
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Listen to real-time socket events (chat_request, request_accepted, request_rejected only)
  $effect(() => {
    const socket = chatStore.socket;
    if (!socket) return;

    const handler = (notification: any) => {
      // Only add non-message notifications to the dropdown
      if (notification.type === 'new_message') return;
      notifications = [notification, ...notifications];
      unreadCount += 1;
    };

    socket.on('notification', handler);

    return () => {
      socket.off('notification', handler);
    };
  });

  // Request browser notification permission on mount (used by chatStore for message alerts)
  onMount(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    fetchNotifications(true);
  });
</script>

<div class="notification-wrapper">
  <button class="bell-btn" onclick={toggleDrawer} aria-label="Notifications">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
    {#if unreadCount > 0}
      <span class="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
    {/if}
  </button>
</div>

<!-- Side Drawer (portal-style, rendered outside sidebar flow) -->
{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drawer-backdrop" onclick={() => isOpen = false}></div>
  <aside class="notification-drawer glass-panel">
    <div class="drawer-header">
      <h2>Notifications</h2>
      <div class="drawer-header-actions">
        {#if unreadCount > 0}
          <button class="mark-all-btn" onclick={markAllAsRead}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Mark all read
          </button>
        {/if}
        <button class="drawer-close-btn" onclick={() => isOpen = false} aria-label="Close notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>

    <div class="drawer-body">
      {#if notifications.length === 0 && !loading}
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <p>No notifications yet</p>
        </div>
      {/if}

      {#each notifications as notification}
        <button 
          class="notification-item {notification.isRead ? '' : 'unread'}"
          onclick={() => handleNotificationClick(notification)}
        >
          <div class="notif-icon-wrap">
            <span class="notif-icon">{getIcon(notification.type)}</span>
          </div>
          <div class="notif-content">
            <span class="notif-label">{getLabel(notification.type)}</span>
            <span class="notif-message">{notification.message}</span>
            <span class="notif-time">{timeAgo(notification.createdAt)}</span>
          </div>
          <div class="notif-actions">
            {#if !notification.isRead}
              <span class="unread-dot"></span>
            {:else}
              <span class="read-check">✓</span>
            {/if}
          </div>
        </button>
      {/each}

      {#if loading}
        <div class="loading-state"><span class="loader small"></span></div>
      {/if}

      {#if hasMore && !loading && notifications.length > 0}
        <button class="load-more-btn" onclick={() => fetchNotifications()}>
          Load more notifications
        </button>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .notification-wrapper {
    position: relative;
  }

  .bell-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .bell-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .badge {
    position: absolute;
    top: 2px;
    right: 2px;
    background: #ef4444;
    color: white;
    font-size: 0.6rem;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    line-height: 1;
    animation: badgePop 0.3s ease-out;
  }

  /* Drawer Backdrop */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
    animation: fadeIn 0.2s ease-out;
  }

  /* The Drawer */
  .notification-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 380px;
    max-width: 90vw;
    height: 100vh;
    z-index: 999;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.25s ease-out;
    border-left: 1px solid var(--glass-border);
    border-radius: 0;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0;
  }

  .drawer-header h2 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0;
  }

  .drawer-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mark-all-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: none;
    border: 1px solid var(--glass-border);
    color: var(--color-primary);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    transition: var(--transition-fast);
  }

  .mark-all-btn:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: var(--color-primary);
  }

  .drawer-close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.35rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: var(--transition-fast);
  }

  .drawer-close-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  /* Notification Items */
  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 1rem 1.5rem;
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    color: var(--text-primary);
    transition: var(--transition-fast);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .notification-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .notification-item.unread {
    background: rgba(99, 102, 241, 0.06);
    border-left: 3px solid var(--color-primary);
  }

  .notif-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .notif-icon {
    font-size: 1.15rem;
  }

  .notif-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 0.15rem;
  }

  .notif-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-muted);
  }

  .notif-message {
    font-size: 0.88rem;
    line-height: 1.35;
    word-break: break-word;
  }

  .notif-time {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  .notif-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding-top: 0.2rem;
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    background: var(--color-primary);
    border-radius: 50%;
  }

  .read-check {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* Empty & Loading States */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1.5rem;
    color: var(--text-muted);
    text-align: center;
  }

  .empty-state svg {
    opacity: 0.4;
  }

  .empty-state p {
    font-size: 0.9rem;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    padding: 1.5rem;
  }

  .loader.small {
    width: 24px;
    height: 24px;
    border: 2px solid var(--glass-border);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s linear infinite;
  }

  .load-more-btn {
    width: 100%;
    padding: 0.85rem;
    background: transparent;
    border: none;
    border-top: 1px solid var(--glass-border);
    color: var(--color-primary);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .load-more-btn:hover {
    background: rgba(99, 102, 241, 0.08);
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes badgePop {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
