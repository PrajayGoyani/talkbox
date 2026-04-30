<script lang="ts">
  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import TypingIndicator from "$components/ui/TypingIndicator.svelte";
  import { cn } from "$lib/utils/cn";
  import { authStore } from "$state/auth.svelte";
  import { chatStore, type Chat, type ChatStatus } from "$state/chat.svelte";
  import type { UserDto } from "@root/shared/types/auth.dto";
  import { formatListTime } from "$utils/date";

  interface Props {
    chat: Chat;
    activeChatId: string | null;
    isMenuOpen: boolean;
    isMenuTarget: boolean;
    processingState: "accepting" | "rejecting" | null;
    onSelect: (chatId: string, otherUser: UserDto, status: ChatStatus) => void;
    onContextMenu: (e: MouseEvent, chat: Chat) => void;
    onAccept: (chatId: string) => void;
    onReject: (chatId: string) => void;
  }

  let {
    chat,
    activeChatId,
    isMenuOpen,
    isMenuTarget,
    processingState,
    onSelect,
    onContextMenu,
    onAccept,
    onReject,
  }: Props = $props();

  const displayName = $derived(chat.otherUser?.name || chat.otherUser?.username || "Unknown");
  const typingUsers = $derived(chatStore.typingStatus.get(chat.id));
  const isTyping = $derived(
    (typingUsers?.size ?? 0) > 0 && !typingUsers?.has(authStore.user?.id || ""),
  );

  const isActive = $derived(activeChatId === chat.id);
  const isPending = $derived(chat.status === "pending");
  const isIncomingRequest = $derived(isPending && chat.createdBy !== authStore.user?.id);
</script>

<div class="relative group">
  <div
    class={cn(
      "chat-item group/item w-full text-left transition-all duration-200",
      isActive && "chat-item-active",
      isMenuOpen && isMenuTarget && "bg-slate-100 dark:bg-white/5",
    )}
    role="button"
    tabindex="0"
    onclick={() => chat.otherUser && onSelect(chat.id, chat.otherUser, chat.status)}
    onkeydown={(e) => e.key === "Enter" && chat.otherUser && onSelect(chat.id, chat.otherUser, chat.status)}
    oncontextmenu={(e) => onContextMenu(e, chat)}
  >
    <!-- Pinned Indicator -->
    {#if chat.isPinned}
      <div
        class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-indigo-600 rounded-r-full shadow-lg z-20"
      ></div>
    {/if}

    <div class="relative shrink-0">
      <Avatar
        user={chat.otherUser || null}
        showBadge={true}
        class="w-11 h-11 bg-slate-200 dark:bg-slate-800 text-lg text-slate-600 dark:text-slate-300"
      />
      {#if chat.otherUser && chatStore.onlineStatus.get(chat.otherUser.id)?.isOnline}
        <div
          class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm"
        ></div>
      {/if}
    </div>

    <div class="flex flex-col flex-1 overflow-hidden text-left">
      <div class="flex justify-between items-baseline gap-2">
        <span
          class="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5"
        >
          {displayName}
          {#if chat.isPinned}
            <Icon name="bolt" class="w-3 h-3 text-indigo-500 rotate-45" />
          {/if}
        </span>
        {#if chat.lastMessage?.sentAt}
          <span class="text-[10px] text-slate-500 shrink-0"
            >{formatListTime(chat.lastMessage.sentAt)}</span
          >
        {/if}
      </div>

      {#if isPending}
        <span class="text-xs text-amber-500 italic truncate mt-0.5">
          {chat.createdBy === authStore.user?.id ? "Request sent" : "Incoming request"}
        </span>
      {:else if isTyping}
        <div class="flex items-center gap-2 mt-0.5">
          <TypingIndicator />
          <span
            class="text-[10px] text-indigo-500 font-bold uppercase tracking-wider animate-pulse"
            >Typing</span
          >
        </div>
      {:else if chat.lastMessage?.contentBody}
        <span
          class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight flex items-baseline gap-1"
        >
          {#if chat.lastMessage.senderId === authStore.user?.id}
            <span
              class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase shrink-0"
              >You:</span
            >
          {/if}
          <span class="truncate">
            {chat.lastMessage.contentBody || ""}
          </span>
        </span>
      {:else}
        <span class="text-xs text-slate-500 truncate mt-0.5">No messages yet</span>
      {/if}
    </div>

    {#if (chat.unreadCount ?? 0) > 0}
      <span
        class="bg-indigo-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 animate-in scale-in-0 duration-300 group-hover:opacity-0 md:group-hover:opacity-0 transition-opacity"
        >{(chat.unreadCount ?? 0) > 99 ? "99+" : chat.unreadCount}</span
      >
    {/if}
  </div>

  <!-- Bottom-Right Menu Trigger -->
  <button
    class="absolute right-0.5 bottom-0.5 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-all z-30 md:opacity-0 md:group-hover:opacity-100"
    class:!opacity-100={isMenuOpen}
    onclick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, chat);
    }}
    title="More options"
  >
    <Icon name="chevron-down" class="w-3.5 h-3.5" />
  </button>

  <!-- Accept/Reject for incoming pending requests -->
  {#if isIncomingRequest}
    <div
      class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-lg"
      class:!opacity-100={!!processingState}
    >
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors disabled:opacity-40 active:scale-95"
        onclick={() => onAccept(chat.id)}
        aria-label="Accept request"
        disabled={!!processingState}
      >
        {#if processingState === "accepting"}
          <span
            class="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
          ></span>
        {:else}
          <Icon name="check" class="w-4 h-4" stroke-width="2.5" />
        {/if}
      </button>
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors disabled:opacity-40 active:scale-95"
        onclick={() => onReject(chat.id)}
        aria-label="Reject request"
        disabled={!!processingState}
      >
        {#if processingState === "rejecting"}
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
