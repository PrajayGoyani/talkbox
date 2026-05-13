<script lang="ts">
  import NotificationSkeleton from "$components/layout/NotificationSkeleton.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { notificationStore } from "$state/notification.svelte";
  import { formatTimeAgo } from "$utils/date";
  import type { NotificationDto } from "shared/types/notification.dto";
  import { onMount, untrack } from "svelte";
  import { quintOut } from "svelte/easing";
  import { fade, fly, slide } from "svelte/transition";

  let { onNavigate, isOpen = $bindable(false) } = $props<{
    onNavigate: (type: string, referenceId: string) => void;
    isOpen?: boolean;
  }>();

  $effect(() => {
    if (isOpen) {
      untrack(() => notificationStore.fetchNotifications(true));
    }
  });

  const handleNotificationClick = (notification: NotificationDto) => {
    if (!notification.isRead) notificationStore.markAsRead(notification._id);
    onNavigate(notification.type, notification.referenceId);
    isOpen = false;
  };

  export const toggleDrawer = () => {
    isOpen = !isOpen;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "chat_request":
        return "add";
      case "request_accepted":
        return "check";
      case "request_rejected":
        return "close";
      case "new_message":
        return "nav-chat";
      default:
        return "notifications";
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

  // Request browser notification permission on mount
  onMount(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  });
</script>

<!-- Notification Drawer (Triggered externally) -->

<!-- Side Drawer (portal-style, rendered outside sidebar flow) -->
{#if isOpen}
  <button
    class="fixed inset-0 bg-black/60 z-998 backdrop-blur-sm border-none w-full h-full"
    onclick={() => (isOpen = false)}
    transition:fade={{ duration: 200 }}
    aria-label="Close notifications"
  ></button>
  <aside
    class="fixed top-0 right-0 w-[400px] max-w-[90vw] h-full bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 z-999 flex flex-col shadow-2xl"
    transition:fly={{ x: 400, duration: 400, easing: quintOut }}
  >
    <div class="p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">Notifications</h2>
      <div class="flex items-center gap-2">
        {#if notificationStore.unreadCount > 0}
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all active:scale-95"
            onclick={() => notificationStore.markAllAsRead()}
          >
            <Icon name="check" class="w-3.5 h-3.5" />
            Mark all read
          </button>
        {/if}
        <button
          class="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-90"
          onclick={() => (isOpen = false)}
          aria-label="Close notifications"
        >
          <Icon name="close" class="w-4.5 h-4.5" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto py-2">
      {#if notificationStore.notifications.length === 0 && !notificationStore.loading}
        <div class="flex flex-col items-center gap-3 p-12 text-slate-500 text-center">
          <Icon name="notifications" class="w-12 h-12 opacity-20" />
          <p class="text-sm">No notifications yet</p>
        </div>
      {/if}

      {#each notificationStore.notifications as notification (notification._id)}
        <div transition:slide={{ duration: 300, easing: quintOut }}>
          <button
            class="flex gap-4 p-4 w-full text-left border-b border-slate-200 dark:border-white/5 transition-all relative group {notification.isRead
              ? 'hover:bg-slate-200/50 dark:hover:bg-white/5'
              : 'bg-indigo-600/5 border-l-2 border-indigo-600 hover:bg-indigo-600/10'}"
            onclick={() => handleNotificationClick(notification)}
          >
            <div
              class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
            >
              <Icon name={getIcon(notification.type) as any} class="w-5 h-5 text-indigo-400" />
            </div>
            <div class="flex flex-col flex-1 min-w-0 gap-0.5">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                >{getLabel(notification.type)}</span
              >
              <span
                class="text-sm text-slate-700 dark:text-slate-200 leading-snug wrap-break-word group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                >{notification.message}</span
              >
              <span class="text-[10px] text-slate-500 mt-0.5">{formatTimeAgo(notification.createdAt)}</span>
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

      {#if notificationStore.loading}
        {#if notificationStore.notifications.length === 0}
          <NotificationSkeleton count={5} />
        {:else}
          <NotificationSkeleton count={1} />
        {/if}
      {/if}

      {#if notificationStore.hasMore && !notificationStore.loading && notificationStore.notifications.length > 0}
        <button
          class="w-full p-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-slate-200 dark:hover:bg-white/5 transition-colors border-t border-slate-200 dark:border-white/5 active:bg-slate-300 dark:active:bg-white/10"
          onclick={() => notificationStore.fetchNotifications()}
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
