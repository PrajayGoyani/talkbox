<script lang="ts">
  import { onMount } from "svelte";
  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";

  interface Toast {
    id: number;
    senderName?: string | null;
    senderUsername: string;
    senderAvatar?: string | null;
    preview: string;
    chatId: string;
  }

  const { onToastClick } = $props<{
    onToastClick?: (chatId: string) => void;
  }>();

  let toasts: Toast[] = $state([]);
  let nextId = 0;

  export const addToast = (data: {
    senderName?: string | null;
    senderUsername: string;
    senderAvatar?: string | null;
    preview: string;
    chatId: string;
  }) => {
    const id = nextId++;
    toasts = [...toasts, { id, ...data }];
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: number) => {
    toasts = toasts.filter((t) => t.id !== id);
  };

  const handleClick = (toast: Toast) => {
    removeToast(toast.id);
    if (onToastClick) onToastClick(toast.chatId);
  };
</script>

{#if toasts.length > 0}
  <div
    class="fixed bottom-6 right-6 flex flex-col-reverse gap-2 z-1000 pointer-events-none"
  >
    {#each toasts as toast (toast.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="pointer-events-auto flex items-center gap-3 p-3.5 rounded-2xl min-w-[300px] max-w-[400px] cursor-pointer bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300 hover:-translate-y-0.5 transition-all"
        onclick={() => handleClick(toast)}
      >
        <Avatar user={{ name: toast.senderName, username: toast.senderUsername, avatarUrl: toast.senderAvatar }} class="w-9 h-9 bg-indigo-600 text-white font-bold text-sm shrink-0 shadow-inner" />
        <div class="flex flex-col flex-1 min-w-0 gap-0.5">
          <span
            class="text-[13px] font-bold text-slate-900 dark:text-white truncate"
            title="@{toast.senderUsername}"
            >{toast.senderName || toast.senderUsername}</span
          >
          <span class="text-xs text-slate-500 dark:text-slate-400 truncate"
            >{toast.preview}</span
          >
        </div>
        <button
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all shrink-0"
          onclick={(e: MouseEvent) => {
            e.stopPropagation();
            removeToast(toast.id);
          }}
          aria-label="Dismiss"
        >
          <Icon name="close" class="w-3.5 h-3.5" />
        </button>
      </div>
    {/each}
  </div>
{/if}
