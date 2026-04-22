<script lang="ts">
  import ChatListSkeleton from "$components/chat/ChatListSkeleton.svelte";
  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { authStore } from "$state/auth.svelte";
  import { chatStore, type ChatStatus, type User } from "$state/chat.svelte";
  import { formatListTime } from "$utils/date";
  import { onMount, untrack } from "svelte";

  const props = $props<{
    activeChatId?: string | null;
    onSelectChat: (chatId: string, otherUser: User, status: ChatStatus) => void;
    activeTab?: string;
    searchQuery?: string;
  }>();

  const activeChatId = $derived(props.activeChatId ?? null);
  const activeTab = $derived(props.activeTab ?? "active");
  const searchQuery = $derived(props.searchQuery ?? "");

  let listContainer: HTMLDivElement | null = $state(null);
  let listContainerHeight = $state(0);
  const SKELETON_ITEM_HEIGHT = 80; // height of ChatListSkeleton
  const skeletonCount = $derived(
    listContainerHeight > 0
      ? Math.ceil(listContainerHeight / SKELETON_ITEM_HEIGHT)
      : 8,
  );

  let loading = $state(false);
  let error = $state<string | null>(null);
  let processingStates = $state<
    Record<string, "accepting" | "rejecting" | null>
  >({});


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
    const query = searchQuery; // track
    untrack(() => {
      // Avoid redundant refresh if query matches store state
      // This also ensures that clearing the search triggers a reload of the full list
      if (query.trim() === (chatStore.currentSearchQuery || "")) {
        return;
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        refreshChats();
      }, 300);
    });
  });


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
  const filteredChats = $derived.by(() => {
    const list = (chatStore.chats || []).filter((chat) => {
      if (!chat) return false;
      if (activeTab === "active") return chat.status === "accepted";
      if (activeTab === "pending") return chat.status === "pending";
      return true;
    });
    return list;
  });

  // Infinite scroll
  let sentinel: HTMLDivElement | null = $state(null);
  let observer: IntersectionObserver | null = null;

  $effect(() => {
    if (!sentinel || !listContainer) return;

    if (observer) observer.disconnect();

    const callback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        if (
          activeTab === "active" &&
          chatStore.hasMoreChats &&
          !chatStore.isLoadingMoreChats
        ) {
          chatStore.loadMoreChats();
        } else if (
          activeTab === "pending" &&
          chatStore.hasMoreRequests &&
          !chatStore.isLoadingMoreRequests
        ) {
          chatStore.loadMoreRequests();
        }
      }
    };

    observer = new IntersectionObserver(callback, {
      root: listContainer,
      rootMargin: "200px",
    });

    observer.observe(sentinel);

    return () => {
      observer?.disconnect();
      observer = null;
    };
  });

  // Initial load + register for socket-driven refreshes
  onMount(() => {
    chatStore.onRefreshChats(() => refreshChats());
  });
</script>

<div
  bind:this={listContainer}
  class="flex flex-col gap-1 h-full p-2 overflow-y-auto"
  bind:clientHeight={listContainerHeight}
>

  <!-- Chat Items -->
  {#if loading}
    <div class="flex flex-col">
      {#each Array(skeletonCount) as _, i}
        <div
          class="animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both"
          style:animation-delay="{i * 75}ms"
        >
          <ChatListSkeleton />
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="text-center py-10 text-rose-500 text-sm">{error}</div>
  {:else if filteredChats.length === 0}
    <div class="text-center py-10 text-slate-500 text-sm">
      {activeTab === "pending" ? "No pending requests" : "No conversations yet"}
    </div>
  {:else}
    <div class="flex flex-col gap-1">
      {#each filteredChats as chat (chat.id)}
        {@const displayName = chat.otherUser.name || chat.otherUser.username}
        <div class="relative group">
          <button
            class="chat-item {activeChatId === chat.id
              ? 'chat-item-active'
              : ''}"
            onclick={() =>
              props.onSelectChat(chat.id, chat.otherUser, chat.status)}
          >
            <div class="relative shrink-0">
              <Avatar
                user={chat.otherUser}
                showBadge={true}
                class="w-11 h-11 bg-slate-200 dark:bg-slate-800 text-lg text-slate-600 dark:text-slate-300"
              />
              {#if chatStore.onlineStatus.get(chat.otherUser.id)?.isOnline}
                <div
                  class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm"
                ></div>
              {/if}
            </div>
            <div class="flex flex-col flex-1 overflow-hidden text-left">
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
              {:else if (chatStore.typingStatus[chat.id]?.size ?? 0) > 0 && !chatStore.typingStatus[chat.id]?.has(authStore.user?.id || "")}
                <span
                  class="text-xs text-indigo-500 font-medium italic animate-pulse truncate mt-0.5"
                >
                  Typing...
                </span>
              {:else if chat.lastMessage?.contentBody}
                <span
                  class="text-xs text-slate-500 truncate mt-0.5 leading-tight"
                >
                  {(chat.lastMessage.contentBody || "").length > 35
                    ? (chat.lastMessage.contentBody || "").substring(0, 35) +
                      "..."
                    : chat.lastMessage.contentBody || ""}
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
          </button>
          <!-- Accept/Reject for incoming pending requests -->
          {#if chat.status === "pending" && chat.createdBy !== authStore.user?.id}
            <div
              class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-lg"
              class:!opacity-100={!!processingStates[chat.id]}
            >
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors disabled:opacity-40 active:scale-95"
                onclick={() => handleAccept(chat.id)}
                aria-label="Accept request"
                disabled={!!processingStates[chat.id]}
              >
                {#if processingStates[chat.id] === "accepting"}
                  <span
                    class="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
                  ></span>
                {:else}
                  <Icon name="check" class="w-4 h-4" stroke-width="2.5" />
                {/if}
              </button>
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors disabled:opacity-40 active:scale-95"
                onclick={() => handleReject(chat.id)}
                aria-label="Reject request"
                disabled={!!processingStates[chat.id]}
              >
                {#if processingStates[chat.id] === "rejecting"}
                  <span
                    class="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"
                  ></span>
                {:else}
                  <Icon name="close" class="w-4 h-4" stroke-width="2.5" />
                {/if}
              </button>
            </div>
          {/if}
        </div>
      {/each}

      <!-- Pagination Sentinel -->
      <div
        bind:this={sentinel}
        class="h-10 w-full flex items-center justify-center py-4"
      >
        {#if (activeTab === "active" && chatStore.isLoadingMoreChats) || (activeTab === "pending" && chatStore.isLoadingMoreRequests)}
          <div class="flex items-center gap-2 text-slate-400 text-xs">
            <span
              class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
            ></span>
            Loading more...
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
