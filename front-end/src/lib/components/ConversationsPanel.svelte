<script lang="ts">
  import ChatList from "./ChatList.svelte";

  const { activeChatId, onSelectChat } = $props<{
    activeChatId?: string | null;
    onSelectChat: (chatId: string, otherUser: any, status: string) => void;
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
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
      Messages
    </h2>
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
