<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import { chatStore } from "../state/chat.svelte";
  import { onMount, untrack } from "svelte";
  import { fly, fade, slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { API_BASE } from "../config";

  let {
    onNavigate,
    isOpen = $bindable(false),
    unreadCount = $bindable(0),
  } = $props<{
    onNavigate: (type: string, referenceId: string) => void;
    isOpen?: boolean;
    unreadCount?: number;
  }>();

  let notifications: Array<any> = $state([]);
  let loading = $state(false);
  let skip = $state(0);
  let hasMore = $state(true);
  const LIMIT = 15;

  $effect(() => {
    if (isOpen) {
      untrack(() => fetchNotifications(true));
    }
  });

  const fetchNotifications = async (reset = false) => {
    if (loading) return;
    loading = true;
    const currentSkip = reset ? 0 : skip;
    try {
      const resp = await fetch(
        `${API_BASE}/notifications?limit=${LIMIT}&skip=${currentSkip}`,
        {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
          credentials: "include",
        },
      );
      if (!resp.ok) throw new Error("Failed to load notifications");
      const result = await resp.json();
      const data = result.data;

      // Concurrency guard: check if skip still matches (simple version)
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
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      notifications = notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n,
      );
      unreadCount = Math.max(0, unreadCount - 1);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      notifications = notifications.map((n) => ({ ...n, isRead: true }));
      unreadCount = 0;
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) markAsRead(notification._id);
    onNavigate(notification.type, notification.referenceId);
    isOpen = false;
  };

  export const toggleDrawer = () => {
    isOpen = !isOpen;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "chat_request":
        return "📩";
      case "request_accepted":
        return "✅";
      case "request_rejected":
        return "❌";
      case "new_message":
        return "💬";
      default:
        return "🔔";
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "chat_request":
        return "Chat Request";
      case "request_accepted":
        return "Request Accepted";
      case "request_rejected":
        return "Request Declined";
      case "new_message":
        return "New Message";
      default:
        return "Notification";
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
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
      if (notification.type === "new_message") return;
      notifications = [notification, ...notifications];
      unreadCount += 1;
    };

    socket.on("notification", handler);

    return () => {
      socket.off("notification", handler);
    };
  });

  // Request browser notification permission on mount (used by chatStore for message alerts)
  onMount(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Only fetch if not already open (to avoid double call if open starts as true, though unlikely)
    if (!isOpen) {
      fetchNotifications(true);
    }
  });
</script>

<!-- Notification Drawer (Triggered externally) -->

<!-- Side Drawer (portal-style, rendered outside sidebar flow) -->
{#if isOpen}
  <button
    class="fixed inset-0 bg-black/60 z-998 backdrop-blur-sm border-none w-full h-full cursor-default"
    onclick={() => (isOpen = false)}
    transition:fade={{ duration: 200 }}
    aria-label="Close notifications"
  ></button>
  <aside
    class="fixed top-0 right-0 w-[400px] max-w-[90vw] h-full bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 z-999 flex flex-col shadow-2xl"
    transition:fly={{ x: 400, duration: 400, easing: quintOut }}
  >
    <div
      class="p-5 border-b border-white/5 flex items-center justify-between shrink-0"
    >
      <h2 class="text-lg font-bold text-white">Notifications</h2>
      <div class="flex items-center gap-2">
        {#if unreadCount > 0}
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all"
            onclick={markAllAsRead}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><polyline points="20 6 9 17 4 12"></polyline></svg
            >
            Mark all read
          </button>
        {/if}
        <button
          class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          onclick={() => (isOpen = false)}
          aria-label="Close notifications"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><line x1="18" y1="6" x2="6" y2="18"></line><line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            ></line></svg
          >
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto py-2">
      {#if notifications.length === 0 && !loading}
        <div
          class="flex flex-col items-center gap-3 p-12 text-slate-500 text-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="opacity-20"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            ><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path
              d="M13.73 21a2 2 0 0 1-3.46 0"
            ></path></svg
          >
          <p class="text-sm">No notifications yet</p>
        </div>
      {/if}

      {#each notifications as notification (notification._id)}
        <div transition:slide={{ duration: 300, easing: quintOut }}>
          <button
            class="flex gap-4 p-4 w-full text-left border-b border-white/5 transition-all relative group {notification.isRead
              ? 'hover:bg-white/5'
              : 'bg-indigo-600/5 border-l-2 border-indigo-600 hover:bg-indigo-600/10'}"
            onclick={() => handleNotificationClick(notification)}
          >
            <div
              class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
            >
              <span class="text-xl">{getIcon(notification.type)}</span>
            </div>
            <div class="flex flex-col flex-1 min-w-0 gap-0.5">
              <span
                class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                >{getLabel(notification.type)}</span
              >
              <span class="text-sm text-slate-200 leading-snug wrap-break-word group-hover:text-white transition-colors"
                >{notification.message}</span
              >
              <span class="text-[10px] text-slate-500 mt-0.5"
                >{timeAgo(notification.createdAt)}</span
              >
            </div>
            <div class="flex items-start shrink-0 pt-1">
              {#if !notification.isRead}
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
              {:else}
                <span class="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">✓</span>
              {/if}
            </div>
          </button>
        </div>
      {/each}

      {#if loading}
        <div class="flex justify-center p-6">
          <span
            class="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
          ></span>
        </div>
      {/if}

      {#if hasMore && !loading && notifications.length > 0}
        <button
          class="w-full p-4 text-indigo-400 text-sm font-medium hover:bg-white/5 transition-colors border-t border-white/5"
          onclick={() => fetchNotifications()}
        >
          Load more notifications
        </button>
      {/if}
    </div>
  </aside>
{/if}

<style>
  /* Styles moved to app.css */
</style>
