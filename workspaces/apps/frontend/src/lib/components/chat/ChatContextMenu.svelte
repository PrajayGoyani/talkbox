<script lang="ts">
  import { chatListStore } from "$state/chat/chat-list.svelte";
  import { chatActions } from "$state/chat/chat-actions.svelte";

  import Icon from "$components/ui/Icon.svelte";
  import type { Chat } from "$lib/types/chat";
  import { cn } from "$utils/cn";
  import { scale } from "svelte/transition";

  let {
    x = 0,
    y = 0,
    isOpen = $bindable(false),
    chat,
    onClose,
  } = $props<{
    x: number;
    y: number;
    isOpen: boolean;
    chat: Chat | null;
    onClose: () => void;
  }>();

  let menuElement: HTMLDivElement | undefined = $state();

  const handlePin = () => {
    if (chat) {
      chatListStore.toggleChatPin(chat.id);
    }
    close();
  };

  const handleMarkRead = () => {
    if (chat) {
      chatActions.markChatRead(chat.id);
    }
    close();
  };

  const handleDelete = () => {
    // Current implementation doesn't have a chat deletion API in chatStore yet,
    // but we can add one or just close for now.
    close();
  };

  const close = () => {
    isOpen = false;
    onClose();
  };

  const handleClickOutside = () => {
    close();
  };

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy: () => node.remove(),
    };
  }
</script>

{#if isOpen && chat}
  <!-- Backdrop to capture clicks and scrolls outside -->
  <div
    use:portal
    role="button"
    tabindex="-1"
    aria-label="Close menu"
    class="fixed inset-0 z-9999"
    onmousedown={handleClickOutside}
    onwheel={close}
    oncontextmenu={(e) => {
      e.preventDefault();
      close();
    }}
  ></div>

  <div
    use:portal
    bind:this={menuElement}
    class="fixed z-10000 w-56 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 glass-panel"
    style:top="{y}px"
    style:left="{x}px"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <button
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 group"
      onclick={handlePin}
    >
      <Icon
        name="bolt"
        class={cn(
          "w-4.5 h-4.5 transition-transform group-hover:rotate-12",
          chat.isPinned ? "text-indigo-500 fill-indigo-500" : "text-slate-400",
        )}
      />
      {chat.isPinned ? "Unpin Chat" : "Pin to Top"}
    </button>

    <button
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 group"
      onclick={handleMarkRead}
      disabled={(chat.unreadCount ?? 0) === 0}
    >
      <Icon name="check" class="w-4.5 h-4.5 text-slate-400 group-hover:text-emerald-500" />
      Mark as Read
    </button>

    <div class="my-1.5 border-t border-slate-100 dark:border-white/5"></div>

    <button
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 group"
      onclick={handleDelete}
    >
      <Icon name="trash" class="w-4.5 h-4.5 transition-transform group-hover:rotate-6" />
      Delete Conversation
    </button>
  </div>
{/if}
