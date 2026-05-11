<script lang="ts">
  import { chatListStore } from "$state/chat/chat-list.svelte";
  import { chatActions } from "$state/chat/chat-actions.svelte";

  import ChatList from "$components/chat/ChatList.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import SegmentedControl from "$components/ui/SegmentedControl.svelte";
  import type { ChatStatus } from "$lib/types/chat";
  import { tooltip } from "$state/tooltip.svelte";
  import { uiStore } from "$state/ui.svelte";
  import { USERNAME_ERROR } from "shared/constants/validation";
  import type { UserDto } from "shared/types/auth.dto";
  import { isValidUsername } from "shared/utils/validation";
  import { slide } from "svelte/transition";

  const {
    activeChatId,
    onSelectChat,
    unreadCount = 0,
    onNotificationToggle,
  } = $props<{
    activeChatId?: string | null;
    onSelectChat: (chatId: string, otherUser: UserDto, status: ChatStatus) => void;
    unreadCount?: number;
    onNotificationToggle?: () => void;
  }>();

  let chatListRef: ReturnType<typeof ChatList> | undefined = $state();
  let searchQuery = $state("");
  let activeTab: "all" | "unread" = $state("all");

  const unreadCountForTab = $derived(chatListStore.unreadChatsCount);

  // New chat request state
  let showRequestInput = $state(false);
  let requestUsername = $state("");
  let requestLoading = $state(false);
  let requestError = $state<string | null>(null);
  let requestSuccess = $state<string | null>(null);

  const tooltipPos = $derived(uiStore.windowWidth < 768 ? "top" : "right");

  const handleSendRequest = async () => {
    if (!requestUsername.trim()) return;

    if (!isValidUsername(requestUsername)) {
      requestError = USERNAME_ERROR;
      return;
    }
    requestLoading = true;
    requestError = null;
    requestSuccess = null;
    try {
      await chatActions.sendChatRequest(requestUsername);
      requestSuccess = `Request sent to ${requestUsername}!`;
      requestUsername = "";
      // Keep input open for a moment to show success, then close
      setTimeout(() => {
        if (requestSuccess) {
          showRequestInput = false;
          requestSuccess = null;
        }
      }, 2000);
    } catch (e) {
      requestError = (e as Error).message;
    } finally {
      requestLoading = false;
    }
  };

  export const refreshChats = () => {
    if (chatListRef && (chatListRef as any).refreshChats) {
      (chatListRef as any).refreshChats();
    }
  };
</script>

<div class="h-full flex flex-col">
  <div class="p-5 border-b border-slate-200 dark:border-white/10 shrink-0">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Messages</h2>
      </div>

      <div class="flex items-center gap-2">
        <!-- New Chat Button (Desktop) -->
        <button
          class={[
            "hidden md:flex w-8 h-8 items-center justify-center rounded-lg transition-all active:scale-95",
            showRequestInput ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10",
          ]}
          onclick={() => (showRequestInput = !showRequestInput)}
          use:tooltip={{
            text: showRequestInput ? "Close New Chat" : "New Chat",
            position: tooltipPos,
          }}
          aria-label="New Chat"
        >
          {#if showRequestInput}
            <Icon name="close" class="w-4 h-4" />
          {:else}
            <Icon name="add" class="w-4 h-4" />
          {/if}
        </button>

        <button
          class="w-8 h-8 md:hidden flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all relative"
          onclick={onNotificationToggle}
          aria-label="Notifications"
        >
          <Icon name="notifications" class="w-4.5 h-4.5" />
          {#if unreadCount > 0}
            <span
              class="absolute top-0 right-0 bg-rose-600 text-white text-[8px] font-bold min-w-[12px] h-3 rounded-full flex items-center justify-center px-1 shadow-sm"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          {/if}
        </button>
      </div>
    </div>

    <!-- Search and New Chat row -->
    <div class="flex flex-col gap-3">
      <div class="relative group">
        <Icon
          name="search"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
        />
        <input
          type="text"
          placeholder="Search active chats..."
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black/20 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          bind:value={searchQuery}
        />
      </div>

      <SegmentedControl
        bind:value={activeTab}
        options={[
          { label: "All", value: "all" },
          {
            label: "Unread",
            value: "unread",
            badge: unreadCountForTab > 0 ? unreadCountForTab : undefined,
          },
        ]}
      />

      <!-- Collapsible Request Form -->
      {#if showRequestInput}
        <div
          class="flex flex-col gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20"
          transition:slide={{ duration: 250 }}
        >
          <div class="flex gap-2">
            <input
              type="text"
              placeholder="Enter username..."
              class="flex-1 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              bind:value={requestUsername}
              oninput={() => (requestError = null)}
              onkeydown={(e) => e.key === "Enter" && handleSendRequest()}
              disabled={requestLoading}
            />
            <button
              class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center min-w-[60px]"
              onclick={handleSendRequest}
              disabled={requestLoading || !requestUsername.trim()}
            >
              {#if requestLoading}
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {:else}
                Send
              {/if}
            </button>
          </div>

          {#if requestError}
            <p class="text-[11px] text-rose-500 font-medium px-1">
              {requestError}
            </p>
          {:else if requestSuccess}
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-1">
              {requestSuccess}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <div class="flex-1 min-h-0">
    <ChatList bind:this={chatListRef} {activeChatId} {onSelectChat} {searchQuery} {activeTab} />
  </div>

  <!-- Mobile Floating Action Button (FAB) -->
  <button
    class="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 z-50 hover:rotate-90"
    onclick={() => (showRequestInput = !showRequestInput)}
    use:tooltip={{
      text: showRequestInput ? "Close New Chat" : "New Chat",
      position: "top",
    }}
    aria-label="New Chat"
  >
    <Icon name={showRequestInput ? "close" : "add"} class="w-6 h-6 transition-transform" />
  </button>
</div>
