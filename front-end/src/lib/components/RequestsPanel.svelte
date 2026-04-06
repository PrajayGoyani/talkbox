<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import { chatStore } from "../state/chat.svelte";
  import { onMount } from "svelte";
  import { API_BASE } from "../config";
  import Avatar from "./Avatar.svelte";

  let pendingChats: Array<any> = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // New chat request
  let requestUsername = $state("");
  let requestLoading = $state(false);
  let requestError = $state<string | null>(null);
  let requestSuccess = $state<string | null>(null);
  let processingStates: Record<string, 'accepting' | 'rejecting' | null> = $state({});

  export const refreshRequests = async () => {
    await fetchPendingChats();
  };

  const fetchPendingChats = async () => {
    loading = true;
    error = null;
    try {
      const resp = await fetch(`${API_BASE}/chat`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to load chats");
      const result = await resp.json();
      const allChats = result.data || [];
      pendingChats = allChats.filter((c: any) => c.status === "pending");
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  };

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
      await fetchPendingChats();
    } catch (e) {
      requestError = (e as Error).message;
    } finally {
      requestLoading = false;
    }
  };

  const handleAccept = async (chatId: string) => {
    if (processingStates[chatId]) return;
    processingStates[chatId] = 'accepting';
    try {
      await fetch(`${API_BASE}/chat/${chatId}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      await fetchPendingChats();
    } catch (e) {
      console.error(e);
    } finally {
      delete processingStates[chatId];
    }
  };

  const handleReject = async (chatId: string) => {
    if (processingStates[chatId]) return;
    processingStates[chatId] = 'rejecting';
    try {
      await fetch(`${API_BASE}/chat/${chatId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      await fetchPendingChats();
    } catch (e) {
      console.error(e);
    } finally {
      delete processingStates[chatId];
    }
  };

  const incomingRequests = $derived(
    pendingChats.filter((c) => c.createdBy !== authStore.user?.id),
  );
  const outgoingRequests = $derived(
    pendingChats.filter((c) => c.createdBy === authStore.user?.id),
  );

  onMount(() => {
    fetchPendingChats();
    chatStore.onRefreshChats(() => fetchPendingChats());
  });
</script>

<div class="h-full flex flex-col">
  <div class="panel-header">
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
      Chat Requests
    </h2>
  </div>

  <div class="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
    <!-- New Chat Request -->
    <div class="flex flex-col gap-2">
      <label
        for="request-username"
        class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"
        >Send a chat request</label
      >
      <div class="flex gap-2 items-center">
        <input
          type="text"
          id="request-username"
          placeholder="Enter username..."
          bind:value={requestUsername}
          class="input-field flex-1 py-2! px-3! text-sm!"
          onkeydown={(e) => e.key === "Enter" && handleSendRequest()}
        />
        <button
          class="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0"
          onclick={handleSendRequest}
          disabled={requestLoading || !requestUsername.trim()}
          aria-label="Send request"
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
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          {/if}
        </button>
      </div>
      {#if requestError}
        <span class="text-rose-500 text-[11px] ml-1">{requestError}</span>
      {/if}
      {#if requestSuccess}
        <span
          class="text-emerald-500 text-[11px] ml-1 animate-in fade-in duration-300"
          >{requestSuccess}</span
        >
      {/if}
    </div>

    <hr class="border-t border-slate-200 dark:border-white/10 my-1" />

    <!-- Incoming Requests -->
    <div class="flex flex-col gap-2">
      <span
        class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"
      >
        Incoming
        {#if incomingRequests.length > 0}
          <span
            class="bg-indigo-600 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
            >{incomingRequests.length}</span
          >
        {/if}
      </span>
      {#if loading}
        <div class="flex justify-center p-4">
          <span
            class="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
          ></span>
        </div>
      {:else if incomingRequests.length === 0}
        <div class="text-sm text-slate-500 py-2">No incoming requests</div>
      {:else}
        {#each incomingRequests as chat}
          {@const displayName = chat.otherUser.name || chat.otherUser.username}
          <div
            class="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <Avatar user={chat.otherUser} class="w-9 h-9 bg-indigo-600 text-white text-sm" />
              <div class="flex flex-col min-w-0">
                <span
                  class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                  title="@{chat.otherUser.username}">{displayName}</span
                >
                <span class="text-[11px] text-slate-500">Wants to connect</span>
              </div>
            </div>
            <div class="flex gap-1.5 shrink-0">
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                onclick={() => handleAccept(chat.id)}
                aria-label="Accept"
                disabled={!!processingStates[chat.id]}
              >
                {#if processingStates[chat.id] === 'accepting'}
                  <span class="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></span>
                {:else}
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
                {/if}
              </button>
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors disabled:opacity-40"
                onclick={() => handleReject(chat.id)}
                aria-label="Reject"
                disabled={!!processingStates[chat.id]}
              >
                {#if processingStates[chat.id] === 'rejecting'}
                  <span class="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></span>
                {:else}
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
                {/if}
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Outgoing Requests -->
    <div class="flex flex-col gap-2">
      <span
        class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
        >Sent</span
      >
      {#if outgoingRequests.length === 0 && !loading}
        <div class="text-sm text-slate-500 py-2">No pending sent requests</div>
      {:else}
        {#each outgoingRequests as chat}
          {@const displayName = chat.otherUser.name || chat.otherUser.username}
          <div
            class="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <Avatar user={chat.otherUser} class="w-9 h-9 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm" />
              <div class="flex flex-col min-w-0">
                <span
                  class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                  title="@{chat.otherUser.username}">{displayName}</span
                >
                <span class="text-[11px] text-slate-500"
                  >Waiting for response...</span
                >
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
