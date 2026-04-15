<script lang="ts">
  import { type User } from "../../state/chat.svelte";
  import ChatList from "../chat/ChatList.svelte";

  const {
    activeChatId,
    onSelectChat,
    unreadCount = 0,
    onNotificationToggle,
  } = $props<{
    activeChatId?: string | null;
    onSelectChat: (chatId: string, otherUser: User, status: string) => void;
    unreadCount?: number;
    onNotificationToggle?: () => void;
  }>();

  let chatListRef: ReturnType<typeof ChatList> | undefined = $state();
  let searchQuery = $state("");

  export const refreshChats = () => {
    if (chatListRef && chatListRef.refreshChats) {
      chatListRef.refreshChats();
    }
  };
</script>

<div class="h-full flex flex-col">
  <div class="p-5 border-b border-slate-200 dark:border-white/10">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <!-- <img src="/favicon.png" alt="Talkbox Logo" class="w-7 h-7 rounded-lg" /> -->
        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
          Messages
          <!-- Talkbox -->
        </h2>
      </div>
      <button
        class="w-9 h-9 md:hidden flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all relative"
        onclick={onNotificationToggle}
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {#if unreadCount > 0}
          <span
            class="absolute top-0.5 right-0.5 bg-rose-600 text-white text-[9px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-1 shadow-sm animate-in scale-in-0 duration-300"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        {/if}
      </button>
    </div>
    <div class="relative">
      <input
        type="text"
        placeholder="Search active chats..."
        class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black/20 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        bind:value={searchQuery}
      />
    </div>
  </div>

  <div class="flex-1 overflow-y-auto p-2">
    <ChatList
      bind:this={chatListRef}
      {activeChatId}
      {onSelectChat}
      {searchQuery}
      activeTab="active"
    />
  </div>
</div>
