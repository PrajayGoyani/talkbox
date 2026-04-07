<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import { chatStore, type User, type ChatStatus } from "../state/chat.svelte";
  import { onMount } from "svelte";
  import { formatListTime } from "../utils/date";
  import Avatar from "./Avatar.svelte";
  import Icon from "./Icon.svelte";

  const {
    activeChatId = null,
    onSelectChat,
    activeTab = "active",
    searchQuery = "",
  } = $props<{
    activeChatId?: string | null;
    onSelectChat: (chatId: string, otherUser: User, status: ChatStatus) => void;
    activeTab?: string;
    searchQuery?: string;
  }>();

  let loading = $state(false);
  let error = $state<string | null>(null);
  let processingStates = $state<Record<string, "accepting" | "rejecting" | null>>(
    {},
  );

  // New chat request
  let showRequestInput = $state(false);
  let requestUsername = $state("");
  let requestLoading = $state(false);
  let requestError = $state<string | null>(null);
  let requestSuccess = $state<string | null>(null);

  export const refreshChats = async () => {
    loading = true;
    try {
      await chatStore.fetchChats(searchQuery);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  };

  let searchTimeout: ReturnType<typeof setTimeout>;
  $effect(() => {
    clearTimeout(searchTimeout);
    const currentQuery = searchQuery;
    searchTimeout = setTimeout(() => {
      refreshChats();
    }, 300);
  });

  const handleSendRequest = async () => {
    if (!requestUsername.trim()) return;
    requestLoading = true;
    requestError = null;
    requestSuccess = null;
    try {
      await chatStore.sendChatRequest(requestUsername);
      requestSuccess = `Request sent to ${requestUsername}!`;
      requestUsername = "";
      showRequestInput = false;
    } catch (e) {
      requestError = (e as Error).message;
    } finally {
      requestLoading = false;
    }
  };

  const handleAccept = async (chatId: string) => {
    if (processingStates[chatId]) return;
    processingStates[chatId] = "accepting";
    try {
      await chatStore.acceptChat(chatId);
    } catch (e) {
      console.error(e);
    } finally {
      processingStates[chatId] = null;
    }
  };

  const handleReject = async (chatId: string) => {
    if (processingStates[chatId]) return;
    processingStates[chatId] = "rejecting";
    try {
      await chatStore.rejectChat(chatId);
    } catch (e) {
      console.error(e);
    } finally {
      delete processingStates[chatId];
    }
  };

  // Filter chats based on active tab
  const filteredChats = $derived(
    chatStore.chats.filter((chat) => {
      if (activeTab === "active") return chat.status === "accepted";
      if (activeTab === "pending") return chat.status === "pending";
      return true;
    }),
  );

  // Initial load + register for socket-driven refreshes
  onMount(() => {
    chatStore.onRefreshChats(() => refreshChats());
  });
</script>

<div class="flex flex-col gap-1 h-full p-2">
  <!-- New Chat Request Button -->
  <div class="mb-2 flex flex-col gap-1.5">
    {#if showRequestInput}
      <div class="flex gap-1.5 items-center">
        <input
          type="text"
          placeholder="Enter username..."
          bind:value={requestUsername}
          class="input-field flex-1"
          onkeydown={(e) => e.key === "Enter" && handleSendRequest()}
        />
        <button
          class="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-40"
          onclick={handleSendRequest}
          disabled={requestLoading || !requestUsername.trim()}
          aria-label="Send chat request"
        >
          {#if requestLoading}
            <span
              class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
            ></span>
          {:else}
            <Icon name="send" class="w-4 h-4" />
          {/if}
        </button>
        <button
          class="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
          onclick={() => {
            showRequestInput = false;
            requestError = null;
          }}
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>
      {#if requestError}
        <span class="text-rose-500 text-[11px] ml-1">{requestError}</span>
      {/if}
    {:else}
      <button
        class="flex items-center justify-center gap-2 w-full p-2.5 border border-dashed border-slate-300 dark:border-white/10 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-sm font-medium"
        onclick={() => (showRequestInput = true)}
      >
        <Icon name="check" class="w-4 h-4" stroke-width="2" />
        New Chat
      </button>
    {/if}
    {#if requestSuccess}
      <span
        class="text-emerald-500 text-[11px] ml-1 animate-in fade-in duration-300"
        >{requestSuccess}</span
      >
    {/if}
  </div>

  <!-- Chat Items -->
  {#if loading}
    <div class="flex items-center justify-center py-10">
      <span
        class="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
      ></span>
    </div>
  {:else if error}
    <div class="text-center py-10 text-rose-500 text-sm">{error}</div>
  {:else if filteredChats.length === 0}
    <div class="text-center py-10 text-slate-500 text-sm">
      {activeTab === "pending" ? "No pending requests" : "No conversations yet"}
    </div>
  {:else}
    {#each filteredChats as chat}
      {@const displayName = chat.otherUser.name || chat.otherUser.username}
      <div class="relative group">
        <button
          class="chat-item {activeChatId === chat.id ? 'chat-item-active' : ''}"
          onclick={() => onSelectChat(chat.id, chat.otherUser, chat.status)}
          title="@{chat.otherUser.username}"
        >
          <div class="relative shrink-0">
            <Avatar user={chat.otherUser} class="w-11 h-11 bg-slate-200 dark:bg-slate-800 text-lg text-slate-600 dark:text-slate-300" />
            {#if chatStore.onlineStatus[chat.otherUser.id]?.isOnline}
              <div class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm"></div>
            {/if}
          </div>
          <div class="flex flex-col flex-1 overflow-hidden">
            <div class="flex justify-between items-baseline gap-2">
              <span
                class="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate"
                >{displayName}</span
              >
              {#if chat.lastMessage?.sentAt}
                <span class="text-[10px] text-slate-500 shrink-0"
                  >{formatListTime(chat.lastMessage.sentAt)}</span
                >
              {/if}
            </div>
            {#if chat.status === "pending"}
              <span class="text-xs text-amber-500 italic truncate mt-0.5">
                {chat.createdBy === authStore.user?.id
                   ? "Request sent"
                   : "Incoming request"}
               </span>
            {:else if (chatStore.typingStatus[chat.id]?.size ?? 0) > 0 && !chatStore.typingStatus[chat.id]?.has(authStore.user?.id || '')}
               <span class="text-xs text-indigo-500 font-medium italic animate-pulse truncate mt-0.5">
                 Typing...
               </span>
            {:else if chat.lastMessage?.contentBody}
               <span class="text-xs text-slate-500 truncate mt-0.5 leading-tight">
                 {(chat.lastMessage.contentBody || "").length > 35
                    ? (chat.lastMessage.contentBody || "").substring(0, 35) + "..."
                    : (chat.lastMessage.contentBody || "")}
               </span>
            {:else}
              <span class="text-xs text-slate-500 truncate mt-0.5"
                >No messages yet</span
              >
            {/if}
          </div>
          {#if (chat.unreadCount ?? 0) > 0}
            <span
              class="bg-indigo-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 animate-in scale-in-0 duration-300"
              >{(chat.unreadCount ?? 0) > 99 ? "99+" : chat.unreadCount}</span
            >
          {/if}
        </button>         <!-- Accept/Reject for incoming pending requests -->
        {#if chat.status === "pending" && chat.createdBy !== authStore.user?.id}
          <div
            class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-lg"
            class:!opacity-100={!!processingStates[chat.id]}
          >
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
              onclick={() => handleAccept(chat.id)}
              aria-label="Accept request"
              disabled={!!processingStates[chat.id]}
            >
              {#if processingStates[chat.id] === 'accepting'}
                <span class="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></span>
              {:else}
                <Icon name="check" class="w-4 h-4" stroke-width="2.5" />
              {/if}
            </button>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors disabled:opacity-40"
              onclick={() => handleReject(chat.id)}
              aria-label="Reject request"
              disabled={!!processingStates[chat.id]}
            >
              {#if processingStates[chat.id] === 'rejecting'}
                <span class="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></span>
              {:else}
                <Icon name="close" class="w-4 h-4" stroke-width="2.5" />
              {/if}
            </button>
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
