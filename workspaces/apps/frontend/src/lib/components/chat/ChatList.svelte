<script lang="ts">
  import ChatContextMenu from "$components/chat/ChatContextMenu.svelte";
  import ChatListItem from "$components/chat/ChatListItem.svelte";
  import ChatListSkeleton from "$components/chat/ChatListSkeleton.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { CHAT_SEARCH_DEBOUNCE } from "$lib/config";
  import { chatStore, type Chat, type ChatStatus } from "$state/chat.svelte";
  import { debounce } from "$utils/timing";
  import type { UserDto } from "shared/types/auth.dto";
  import { onMount, untrack } from "svelte";

  let {
    activeChatId: _activeChatId = null,
    onSelectChat,
    activeTab: _activeTab = "all",
    searchQuery: _searchQuery = "",
  } = $props<{
    activeChatId?: string | null;
    onSelectChat: (
      chatId: string,
      otherUser: UserDto,
      status: ChatStatus,
    ) => void;
    activeTab?: "all" | "unread";
    searchQuery?: string;
  }>();

  const activeChatId = $derived(_activeChatId);
  const activeTab = $derived(_activeTab);
  const searchQuery = $derived(_searchQuery);

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

  // Context Menu State
  let menuPos = $state({ x: 0, y: 0 });
  let isMenuOpen = $state(false);
  let menuChat = $state<Chat | null>(null);

  const handleContextMenu = (e: MouseEvent, chat: Chat) => {
    e.preventDefault();
    // Simple bounds check to prevent menu from going off-screen (menu width is 224px, height ~240px)
    let x = e.clientX;
    let y = e.clientY;

    if (x + 230 > window.innerWidth) x -= 230;
    if (y + 250 > window.innerHeight) y -= 250;

    menuPos = { x, y };
    menuChat = chat;
    isMenuOpen = true;
  };

  export const refreshChats = async () => {
    loading = true;
    try {
      await chatStore.fetchChats(searchQuery);
    } catch (e) {
      error = chatStore.lastError;
    } finally {
      loading = false;
    }
  };

  const debouncedRefresh = debounce(() => refreshChats(), CHAT_SEARCH_DEBOUNCE);

  $effect(() => {
    const query = searchQuery; // track
    untrack(() => {
      // Avoid redundant refresh if query matches store state
      if (query.trim() === (chatStore.currentSearchQuery || "")) {
        return;
      }
      debouncedRefresh();
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
      processingStates[chatId] = null;
    }
  };

  // Filter chats based on active tab
  const filteredChats = $derived.by(() => {
    const list = (chatStore.chats || []).filter((chat) => {
      if (!chat) return false;
      if (activeTab === "all") return chat.status === "accepted";
      if (activeTab === "unread")
        return chat.status === "accepted" && (chat.unreadCount ?? 0) > 0;
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
          (activeTab === "all" || activeTab === "unread") &&
          chatStore.hasMoreChats &&
          !chatStore.isLoadingMoreChats
        ) {
          chatStore.loadMoreChats();
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
  {:else if error || chatStore.lastError}
    {#if error === "rate-limited" || chatStore.lastError === "rate-limited"}
      <div
        class="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95"
      >
        <div
          class="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4"
        >
          <Icon name="alert-circle" class="w-8 h-8 text-rose-500" />
        </div>
        <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          Slow Down a Bit
        </h3>
        <p class="text-xs text-slate-500 max-w-[200px] leading-relaxed">
          You've sent too many requests. Please wait a minute before trying
          again.
        </p>
      </div>
    {:else}
      <div class="text-center py-10 text-rose-500 text-sm">
        {error || chatStore.lastError}
      </div>
    {/if}
  {:else if filteredChats.length === 0}
    <div
      class="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500"
    >
      <div
        class="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6"
      >
        <Icon
          name={activeTab === "unread" ? "notifications" : "nav-chat"}
          class="w-10 h-10 text-slate-300 dark:text-slate-600"
        />
      </div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
        {activeTab === "unread"
          ? "You're All Caught Up"
          : "No Conversations Yet"}
      </h3>
      <p class="text-sm text-slate-500 max-w-[200px] leading-relaxed">
        {activeTab === "unread"
          ? "You've read all your messages. Great job!"
          : "Connect with others by sending a magic chat request."}
      </p>
    </div>
  {:else}
    <div class="flex flex-col gap-1">
      {#each filteredChats as chat (chat.id)}
        <ChatListItem
          {chat}
          {activeChatId}
          isMenuOpen={isMenuOpen && menuChat?.id === chat.id}
          isMenuTarget={menuChat?.id === chat.id}
          processingState={processingStates[chat.id] ?? null}
          onSelect={onSelectChat}
          onContextMenu={handleContextMenu}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      {/each}

      <!-- Pagination Sentinel -->
      <div
        bind:this={sentinel}
        class="h-10 w-full flex items-center justify-center py-4"
      >
        {#if (activeTab === "all" || activeTab === "unread") && chatStore.isLoadingMoreChats}
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

<ChatContextMenu
  bind:isOpen={isMenuOpen}
  x={menuPos.x}
  y={menuPos.y}
  chat={menuChat}
  onClose={() => (menuChat = null)}
/>
