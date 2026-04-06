<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import { chatStore } from "../state/chat.svelte";
  import { onMount } from "svelte";
  import { API_BASE } from "../config";
  import Avatar from "./Avatar.svelte";

  /** Format a timestamp for chat listing: time if today, 'Yesterday', or date */
  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (isYesterday) return "Yesterday";
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  }

  const {
    activeChatId = null,
    onSelectChat,
    activeTab = "active",
    searchQuery = "",
  } = $props<{
    activeChatId?: string | null;
    onSelectChat: (chatId: string, otherUser: any, status: string) => void;
    activeTab?: string;
    searchQuery?: string;
  }>();

  let chats: Array<any> = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // New chat request
  let showRequestInput = $state(false);
  let requestUsername = $state("");
  let requestLoading = $state(false);
  let requestError = $state<string | null>(null);
  let requestSuccess = $state<string | null>(null);

  export const refreshChats = async () => {
    await fetchChats(searchQuery);
  };

  const fetchChats = async (query = "") => {
    loading = true;
    error = null;
    try {
      const endpoint =
        query.trim().length > 0
          ? `${API_BASE}/chat/search?q=${encodeURIComponent(query.trim())}`
          : `${API_BASE}/chat`;

      const resp = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to load chats");
      const result = await resp.json();
      chats = result.data || [];
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
      fetchChats(currentQuery);
    }, 300);
  });

  const handleSendRequest = async () => {
    if (!requestUsername.trim()) return;
    requestLoading = true;
    requestError = null;
    requestSuccess = null;
    try {
      const resp = await fetch(`${API_BASE}/chat/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ username: requestUsername.trim() }),
      });
      const result = await resp.json();
      if (!resp.ok)
        throw new Error(result.error?.message || "Failed to send request");
      requestSuccess = `Request sent to ${requestUsername}!`;
      requestUsername = "";
      showRequestInput = false;
      await fetchChats();
    } catch (e) {
      requestError = (e as Error).message;
    } finally {
      requestLoading = false;
    }
  };

  const handleAccept = async (chatId: string) => {
    try {
      await fetch(`${API_BASE}/chat/${chatId}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      await fetchChats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (chatId: string) => {
    try {
      await fetch(`${API_BASE}/chat/${chatId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      await fetchChats();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter chats based on active tab
  const filteredChats = $derived(
    chats.filter((chat) => {
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
          class="p-2 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-40"
          onclick={handleSendRequest}
          disabled={requestLoading || !requestUsername.trim()}
          aria-label="Send chat request"
        >
          {#if requestLoading}
            <span
              class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
            ></span>
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><line x1="22" y1="2" x2="11" y2="13"></line><polygon
                points="22 2 15 22 11 13 2 9 22 2"
              ></polygon></svg
            >
          {/if}
        </button>
        <button
          class="p-2 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><line x1="12" y1="5" x2="12" y2="19"></line><line
            x1="5"
            y1="12"
            x2="19"
            y2="12"
          ></line></svg
        >
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
          <Avatar user={chat.otherUser} class="w-11 h-11 bg-slate-200 dark:bg-slate-800 text-lg text-slate-600 dark:text-slate-300" />
          <div class="flex flex-col flex-1 overflow-hidden">
            <div class="flex justify-between items-baseline gap-2">
              <span
                class="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate"
                >{displayName}</span
              >
              {#if chat.lastMessage?.sentAt}
                <span class="text-[10px] text-slate-500 shrink-0"
                  >{formatTime(chat.lastMessage.sentAt)}</span
                >
              {/if}
            </div>
            {#if chat.status === "pending"}
              <span class="text-xs text-amber-500 italic truncate mt-0.5">
                {chat.createdBy === authStore.user?.id
                  ? "Request sent"
                  : "Incoming request"}
              </span>
            {:else if chat.lastMessage}
              <span
                class="text-xs text-slate-500 truncate mt-0.5 leading-tight"
              >
                {chat.lastMessage.contentBody.length > 35
                  ? chat.lastMessage.contentBody.substring(0, 35) + "..."
                  : chat.lastMessage.contentBody}
              </span>
            {:else}
              <span class="text-xs text-slate-500 truncate mt-0.5"
                >No messages yet</span
              >
            {/if}
          </div>
          {#if chat.unreadCount > 0}
            <span
              class="bg-indigo-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 animate-in scale-in-0 duration-300"
              >{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</span
            >
          {/if}
        </button>

        <!-- Accept/Reject for incoming pending requests -->
        {#if chat.status === "pending" && chat.createdBy !== authStore.user?.id}
          <div
            class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-lg"
          >
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors"
              onclick={() => handleAccept(chat.id)}
              aria-label="Accept request"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                ><polyline points="20 6 9 17 4 12"></polyline></svg
              >
            </button>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors"
              onclick={() => handleReject(chat.id)}
              aria-label="Reject request"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                ><line x1="18" y1="6" x2="6" y2="18"></line><line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                ></line></svg
              >
            </button>
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
