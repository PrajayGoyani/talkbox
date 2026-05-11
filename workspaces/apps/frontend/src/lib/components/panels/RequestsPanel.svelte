<script lang="ts">
  import { chatListStore } from "$state/chat/chat-list.svelte";
  import { chatActions } from "$state/chat/chat-actions.svelte";

  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { authStore } from "$state/auth.svelte";

  import { USERNAME_ERROR } from "shared/constants/validation";
  import { isValidUsername } from "shared/utils/validation";
  import { onMount } from "svelte";
  import { quintOut } from "svelte/easing";
  import { slide } from "svelte/transition";

  let loading = $state(false);
  let error = $state<string | null>(null);

  // New chat request
  let requestUsername = $state("");
  let requestLoading = $state(false);
  let requestError = $state<string | null>(null);
  let requestSuccess = $state<string | null>(null);
  let processingStates: Record<string, "accepting" | "rejecting" | null> = $state({});

  export const refreshRequests = async () => {
    loading = true;
    try {
      await chatListStore.fetchRequests();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  };

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
      await chatActions.acceptChat(chatId);
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
      await chatActions.rejectChat(chatId);
    } catch (e) {
      console.error(e);
    } finally {
      processingStates[chatId] = null;
    }
  };

  const incomingRequests = $derived(chatListStore.requests.filter((c) => c.createdBy !== authStore.user?.id));
  const outgoingRequests = $derived(chatListStore.requests.filter((c) => c.createdBy === authStore.user?.id));

  onMount(() => {
    refreshRequests();
    chatActions.onRefreshChats(() => refreshRequests());
  });
</script>

<div class="h-full flex flex-col">
  <div class="panel-header">
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Chat Requests</h2>
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
          class="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-40 shrink-0 active:scale-90"
          onclick={handleSendRequest}
          disabled={requestLoading || !requestUsername.trim()}
          aria-label="Send request"
        >
          {#if requestLoading}
            <span class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></span>
          {:else}
            <Icon name={"send"} class="w-4 h-4" />
          {/if}
        </button>
      </div>
      {#if requestError}
        <span class="text-rose-500 text-[11px] ml-1">{requestError}</span>
      {/if}
      {#if requestSuccess}
        <span class="text-emerald-500 text-[11px] ml-1 animate-in fade-in duration-300">{requestSuccess}</span>
      {/if}
    </div>

    <!-- Section Divider with dynamic padding -->
    <div class="h-px bg-slate-200 dark:bg-white/10 mx-[-16px] my-2"></div>

    <!-- Incoming Requests -->
    <div class="flex flex-col gap-2">
      <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
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
          <span class="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></span>
        </div>
      {:else if incomingRequests.length === 0}
        <div class="text-sm text-slate-500 py-2">No incoming requests</div>
      {:else}
        {#each incomingRequests as chat (chat.id)}
          {@const displayName = chat.otherUser?.name || chat.otherUser?.username || "Unknown"}
          <div transition:slide={{ duration: 300, easing: quintOut }}>
            <div
              class="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                  user={chat.otherUser || null}
                  class="w-9 h-9 bg-indigo-600 text-white text-sm group-hover:scale-105 transition-transform"
                />
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                    title="@{chat.otherUser?.username}">{displayName}</span
                  >
                  <span class="text-[11px] text-slate-500">Wants to connect</span>
                </div>
              </div>
              <div class="flex gap-1.5 shrink-0">
                <button
                  class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-all disabled:opacity-40 active:scale-95"
                  onclick={() => handleAccept(chat.id)}
                  aria-label="Accept"
                  disabled={!!processingStates[chat.id]}
                >
                  {#if processingStates[chat.id] === "accepting"}
                    <span
                      class="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
                    ></span>
                  {:else}
                    <Icon name={"check"} class="w-4 h-4" stroke-width="2.5" />
                  {/if}
                </button>
                <button
                  class="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-all disabled:opacity-40 active:scale-95"
                  onclick={() => handleReject(chat.id)}
                  aria-label="Reject"
                  disabled={!!processingStates[chat.id]}
                >
                  {#if processingStates[chat.id] === "rejecting"}
                    <span class="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"
                    ></span>
                  {:else}
                    <Icon name={"close"} class="w-4 h-4" stroke-width="2.5" />
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Outgoing Requests -->
    <div class="flex flex-col gap-2">
      <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sent</span>
      {#if outgoingRequests.length === 0 && !loading}
        <div class="text-sm text-slate-500 py-2">No pending sent requests</div>
      {:else}
        {#each outgoingRequests as chat (chat.id)}
          {@const displayName = chat.otherUser?.name || chat.otherUser?.username || "Unknown"}
          <div transition:slide={{ duration: 300, easing: quintOut }}>
            <div
              class="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                  user={chat.otherUser || null}
                  class="w-9 h-9 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm group-hover:scale-105 transition-transform"
                />
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                    title="@{chat.otherUser?.username}">{displayName}</span
                  >
                  <span class="text-[11px] text-slate-500">Waiting for response...</span>
                </div>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
