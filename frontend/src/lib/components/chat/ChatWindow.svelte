<script lang="ts">
  import { tick } from "svelte";
  import { authStore } from "../../state/auth.svelte";
  import type { User } from "../../state/chat.svelte";
  import { chatStore } from "../../state/chat.svelte";
  import { tooltip, tooltipStore } from "../../state/tooltip.svelte";
  import type { RawMessageDto } from "../../types/chat.dto";
  import {
    formatSimpleTime,
    formatTimeAgo,
    getDateLabel,
  } from "../../utils/date";
  import MessageSkeleton from "../chat/MessageSkeleton.svelte";
  import Avatar from "../ui/Avatar.svelte";
  import Icon from "../ui/Icon.svelte";

  let {
    chatId,
    otherUser,
    status,
    isSidebarCollapsed = $bindable<boolean>(false),
    onBack,
  }: {
    chatId: string;
    otherUser: User | null;
    status: string;
    isSidebarCollapsed?: boolean;
    onBack: () => void;
  } = $props();

  let messageInput = $state("");
  let messagesContainer: HTMLDivElement | undefined = $state();
  let showJumpButton = $state(false);
  let userHasScrolledUp = $state(false);
  let windowContainerHeight = $state(0);
  let copied = $state(false);

  const MESSAGE_SKELETON_HEIGHT = 90;
  const messageSkeletonCount = $derived(
    windowContainerHeight > 0
      ? Math.ceil(windowContainerHeight / MESSAGE_SKELETON_HEIGHT)
      : 6,
  );

  // Auto-scroll when messages change
  $effect(() => {
    const _len = chatStore.messages.length;
    tick().then(() => {
      if (messagesContainer && !userHasScrolledUp) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !chatId || !otherUser?.id) return;
    chatStore.sendMessage(chatId, otherUser.id, messageInput);
    messageInput = "";
    scrollToBottom();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = () => {
    if (chatId && otherUser?.id) {
      chatStore.emitTyping(chatId, otherUser.id, true);
    }
  };

  const scrollToBottom = () => {
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: "smooth",
      });
      userHasScrolledUp = false;
      showJumpButton = false;
    }
  };

  const handleMessagesScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    showJumpButton = distanceFromBottom > 300;

    if (distanceFromBottom < 50) {
      userHasScrolledUp = false;
    } else if (distanceFromBottom > 150) {
      userHasScrolledUp = true;
    }

    if (
      target.scrollTop < 50 &&
      chatStore.hasMoreMessages &&
      !chatStore.isLoadingMessages
    ) {
      const scrollBottom = target.scrollHeight - target.scrollTop;
      chatStore.loadOlderMessages().then(() => {
        setTimeout(() => {
          if (messagesContainer) {
            messagesContainer.scrollTop =
              messagesContainer.scrollHeight - scrollBottom;
          }
        }, 0);
      });
    }
  };

  const handleCopyUsername = (e: MouseEvent) => {
    if (!otherUser?.username) return;
    const textToCopy = `@${otherUser.username}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      tooltipStore.showTemporary(
        "Username copied",
        e.currentTarget as HTMLElement,
      );
      copied = true;
      setTimeout(() => (copied = false), 2000);
    });
  };

  // Group messages for better sticky header handling
  const groupedMessages = $derived.by(() => {
    const groups: { label: string; messages: RawMessageDto[] }[] = [];
    let lastDateKey = "";

    for (const msg of chatStore.messages) {
      // Use string slicing for O(1) date comparison (YYYY-MM-DD)
      // This avoids calling expensive date formatting functions for every message.
      const dateKey = msg.createdAt.slice(0, 10);

      if (groups.length === 0 || dateKey !== lastDateKey) {
        groups.push({
          label: getDateLabel(msg.createdAt),
          messages: [msg],
        });
        lastDateKey = dateKey;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  });
</script>

<div class="glass-panel p-4 border-b">
  <div class="flex items-center gap-3">
    <!-- Mobile Back Button -->
    <button
      class="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-all mr-2 active:scale-90"
      onclick={onBack}
      aria-label="Back"
    >
      <Icon name="back" class="w-5 h-5" />
    </button>

    <!-- Desktop Sidebar Toggle Button -->
    <button
      class="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-all mr-2 active:scale-90"
      onclick={() => (isSidebarCollapsed = !isSidebarCollapsed)}
      aria-label="Toggle Sidebar"
    >
      <Icon name="sidebar" class="w-5 h-5" />
    </button>
    <Avatar user={otherUser} class="w-9 h-9 bg-indigo-500 text-white text-sm" />
    <div class="flex flex-col min-w-0">
      <div class="flex items-center gap-2">
        <h3
          class="m-0 text-lg font-semibold leading-none truncate"
          title="@{otherUser?.username}"
        >
          {otherUser?.name || otherUser?.username}
        </h3>
        <button
          use:tooltip={"Copy username"}
          onclick={handleCopyUsername}
          class="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-600/10 transition-all active:scale-95 flex items-center justify-center"
          aria-label="Copy username"
        >
          <Icon
            name={copied ? "check" : "copy"}
            class="w-3.5 h-3.5 {copied ? 'text-emerald-500' : ''}"
            stroke-width={copied ? 3 : 2}
          />
        </button>
      </div>
      {#if status === "pending"}
        <span
          class="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500"
          >Pending</span
        >
      {:else}
        <div class="flex items-center gap-1.5 mt-1">
          {#if chatStore.onlineStatus.get(otherUser?.id || "")?.isOnline}
            <span
              class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            ></span><span class="text-xs text-emerald-500 font-medium"
              >Online</span
            >
          {:else if chatStore.onlineStatus.get(otherUser?.id || "")?.lastSeen}
            <span class="text-xs text-slate-500">
              Last seen {formatTimeAgo(
                chatStore.onlineStatus.get(otherUser?.id || "")!.lastSeen!,
              )}
            </span>
          {:else}
            <span class="text-xs text-slate-500">Offline</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if status === "pending"}
  <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
    <div
      class="flex flex-col items-center justify-center gap-4 h-full text-slate-500 text-center"
    >
      <div class="text-amber-500 opacity-70">
        <Icon name="clock" class="w-12 h-12" />
      </div>
      <h3 class="text-xl text-slate-900 dark:text-slate-100 font-bold">
        Waiting for response
      </h3>
      <p class="text-sm max-w-[280px]">
        Messages will be available once the request is accepted.
      </p>
    </div>
  </div>
{:else if status === "rejected"}
  <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
    <div
      class="flex flex-col items-center justify-center gap-4 h-full text-slate-500 text-center"
    >
      <div class="text-rose-500 opacity-70">
        <Icon name="close" class="w-12 h-12" stroke-width="1.5" />
      </div>
      <h3 class="text-xl text-slate-900 dark:text-slate-100 font-bold">
        Request Rejected
      </h3>
      <p class="text-sm max-w-[280px]">
        This chat request was declined or the conversation was ended.
      </p>
    </div>
  </div>
{:else}
  <div
    class="flex-1 overflow-y-auto p-6 flex flex-col gap-2"
    bind:this={messagesContainer}
    bind:clientHeight={windowContainerHeight}
    onscroll={handleMessagesScroll}
  >
    {#if chatStore.isLoadingMessages}
      <div class="flex flex-col">
        {#each Array(messageSkeletonCount) as _, i}
          <div
            class="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
            style:animation-delay="{i * 100}ms"
          >
            <MessageSkeleton sent={i % 2 !== 0} />
          </div>
        {/each}
      </div>
    {/if}

    {#if chatStore.messages.length === 0 && !chatStore.isLoadingMessages}
      <div class="text-center text-sm text-slate-500 mt-4">
        No messages yet. Send a message to start!
      </div>
    {:else}
      {#each groupedMessages as group (group.label)}
        <div class="flex flex-col gap-2 relative">
          <!-- Floating Sticky Date Label -->
          <div
            class="sticky -top-4 z-20 flex justify-center pointer-events-none py-2 -mb-2"
          >
            <span
              class="pointer-events-auto px-4 py-1 text-[10px] tracking-widest font-bold text-slate-500 bg-slate-50/90 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-full shadow-md backdrop-blur-md transition-all duration-300"
            >
              {group.label}
            </span>
          </div>
          <!-- Decorative Separator Line (Non-sticky) -->
          <div
            class="before:content-[''] before:absolute before:top-5 before:left-0 before:right-0 before:h-px before:bg-slate-200 dark:before:bg-white/10 before:z-0"
          ></div>

          {#each group.messages as msg (msg.id)}
            <div
              class="chat-bubble {msg.senderId === authStore.user?.id
                ? 'chat-bubble-sent'
                : 'chat-bubble-received'}"
            >
              <p class="m-0 text-sm leading-relaxed wrap-break-word">
                {msg.contentBody}
              </p>
              <span class="block text-[10px] opacity-70 mt-1 text-right"
                >{formatSimpleTime(msg.createdAt)}</span
              >
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Jump to Latest Button -->
  {#if showJumpButton}
    <button
      class="absolute bottom-[90px] right-6 md:right-8 bg-indigo-600 hover:bg-indigo-500 text-white w-10 h-10 rounded-full shadow-2xl flex items-center justify-center transition-all animate-in slide-in-from-bottom-8 fade-in duration-300 active:scale-90 z-30"
      onclick={scrollToBottom}
      title="Jump to latest"
      aria-label="Scroll to bottom"
    >
      <div class="relative">
        <Icon name="chevron-down" class="w-5 h-5" stroke-width="2.5" />
      </div>
    </button>
  {/if}

  {#if (chatStore.typingStatus[chatId]?.size ?? 0) > 0}
    {#if !chatStore.typingStatus[chatId]?.has(authStore.user?.id || "") || (chatStore.typingStatus[chatId]?.size ?? 0) > 1}
      <div class="px-6 pb-2">
        <span class="text-xs text-slate-500 italic"
          >{otherUser?.name || otherUser?.username} is typing...</span
        >
      </div>
    {/if}
  {/if}

  <div class="p-4 glass-panel border-t flex gap-3 items-center">
    <input
      type="text"
      placeholder="Type a message..."
      class="input-field flex-1 rounded-full! px-5 py-2.5"
      bind:value={messageInput}
      onkeydown={handleKeydown}
      oninput={handleInput}
      disabled={chatStore.isSendingMessage}
    />
    <button
      class="bg-indigo-600 hover:bg-indigo-700 text-white w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
      aria-label="Send message"
      onclick={handleSendMessage}
      disabled={!messageInput.trim() || chatStore.isSendingMessage}
    >
      {#if chatStore.isSendingMessage}
        <span
          class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
        ></span>
      {:else}
        <Icon name="send" class="w-5 h-5" />
      {/if}
    </button>
  </div>
{/if}
