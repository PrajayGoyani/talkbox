<script lang="ts">
  import { tick } from "svelte";
  import { authStore } from "../../state/auth.svelte";
  import { chatStore, type Message, type User } from "../../state/chat.svelte";
  import { tooltip, tooltipStore } from "../../state/tooltip.svelte";
  import { cn } from "../../utils/cn";
  import {
    formatSimpleTime,
    formatTimeAgo,
    getDateLabel,
  } from "../../utils/date";
  import EmojiPicker from "../chat/EmojiPicker.svelte";
  import MessageReactionPicker from "../chat/MessageReactionPicker.svelte";
  import MessageSkeleton from "../chat/MessageSkeleton.svelte";
  import Avatar from "../ui/Avatar.svelte";
  import Icon from "../ui/Icon.svelte";
  import Popover from "../ui/Popover.svelte";
  import Spinner from "../ui/Spinner.svelte";

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

  const isTouchDevice = $derived(
    typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  );

  let messageInput = $state("");
  let messagesContainer: HTMLDivElement | undefined = $state();
  let showJumpButton = $state(false);
  let userHasScrolledUp = $state(false);
  let windowContainerHeight = $state(0);
  let copied = $state(false);
  let textareaElement: HTMLTextAreaElement | undefined = $state();
  let showEmojiPicker = $state(false);

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
    if (textareaElement) {
      textareaElement.style.height = "auto";
      textareaElement.style.overflowY = "hidden";
    }
    scrollToBottom();
  };

  // Keep textarea focused after sending a message or when switching chats
  $effect(() => {
    // We want to focus the textarea whenever the chat is not currently sending,
    // which effectively restores focus after the 'disabled' state is removed.
    if (!chatStore.isSendingMessage && textareaElement && chatId) {
      // Small delay with tick to ensure DOM is fully ready and not disabled
      tick().then(() => {
        textareaElement?.focus();
      });
    }
  });

  const handleKeydown = (e: KeyboardEvent) => {
    // On touch devices, Enter should just create a new line (multiline mode)
    // On desktop, Enter sends, Shift+Enter new lines
    if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    const newHeight = Math.min(target.scrollHeight, 128);
    target.style.height = `${newHeight}px`;
    target.style.overflowY = target.scrollHeight > 128 ? "auto" : "hidden";

    if (chatId && otherUser?.id) {
      chatStore.emitTyping(chatId, otherUser.id, true);
    }
  };

  const insertEmoji = (emoji: string) => {
    if (textareaElement) {
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      messageInput =
        messageInput.substring(0, start) + emoji + messageInput.substring(end);

      // We need tick to update the DOM before setting cursor position
      tick().then(() => {
        if (textareaElement) {
          textareaElement.selectionStart = textareaElement.selectionEnd =
            start + emoji.length;
          textareaElement.focus();
          // Trigger height adjustment
          handleInput({ target: textareaElement } as any);
        }
      });
    } else {
      messageInput += emoji;
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

  // Pre-fetch the emoji picker when the user hovers over the button
  const prefetchEmojiPicker = () => {
    import("emoji-picker-element").catch(() => {});
  };

  // Group messages for better sticky header handling
  const groupedMessages = $derived.by(() => {
    const groups: { label: string; messages: Message[] }[] = [];
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

  const getEmojiDisplayMode = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return "normal";

    // Accurate emoji counting using Intl.Segmenter
    if (typeof Intl?.Segmenter !== "function") {
      const emojiOnlyRegex = /^(\p{Extended_Pictographic}|\s)+$/u;
      if (!emojiOnlyRegex.test(trimmed)) return "normal";
      const emojis = trimmed.match(/\p{Extended_Pictographic}/gu) || [];
      if (emojis.length === 1) return "jumbo-1";
      if (emojis.length === 2) return "jumbo-2";
      if (emojis.length === 3) return "jumbo-3";
      return "normal";
    }

    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(trimmed));
    const emojiRegex = /\p{Extended_Pictographic}/u;
    let count = 0;

    for (const seg of segments) {
      const char = seg.segment.trim();
      if (!char) continue;
      if (emojiRegex.test(char)) {
        count++;
      } else {
        return "normal";
      }
    }

    if (count === 1) return "jumbo-1";
    if (count === 2) return "jumbo-2";
    if (count === 3) return "jumbo-3";
    return "normal";
  };
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
    {#if chatStore.isLoadingMessages && chatStore.messages.length === 0}
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

    {#if chatStore.isLoadingMessages && chatStore.messages.length > 0}
      <div
        class="flex justify-center p-4 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div
          class="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm"
        >
          <Spinner
            class="w-4 h-4 text-slate-400 fill-indigo-500 animate-spin"
          />
          <span
            class="text-[11px] font-bold text-slate-500 tracking-wider uppercase leading-none"
          >
            Loading older messages...
          </span>
        </div>
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

          {#each group.messages as msg, i (msg.id)}
            {@const isFirstInGroup =
              i === 0 || group.messages[i - 1].senderId !== msg.senderId}
            {@const isSent = msg.senderId === authStore.user?.id}

            {@const emojiMode = getEmojiDisplayMode(msg.contentBody)}

            {#if emojiMode !== "normal"}
              <div
                class={cn(
                  "flex flex-col",
                  isSent ? "items-end" : "items-start",
                  i > 0 && !isFirstInGroup ? "mt-1" : "mt-2",
                )}
              >
                <div
                  class={cn(
                    "m-0 select-none",
                    emojiMode === "jumbo-1" && "text-6xl py-2",
                    emojiMode === "jumbo-2" && "text-5xl py-1.5",
                    emojiMode === "jumbo-3" && "text-4xl py-1",
                  )}
                >
                  {msg.contentBody}
                </div>
                <div
                  class={cn(
                    "chat-bubble rounded-2xl px-2.5 py-1 mt-1 flex items-center justify-center min-w-0 relative group",
                    isSent ? "chat-bubble-sent" : "chat-bubble-received",
                  )}
                >
                  <span
                    class="text-[9px] opacity-70 leading-none font-medium whitespace-nowrap"
                  >
                    {formatSimpleTime(msg.createdAt)}
                  </span>
                  <MessageReactionPicker {msg} {isSent} />
                </div>
                <!-- Reactions rendering for jumbo -->
                {@render reactionList(msg, isSent)}
              </div>
            {:else}
              <div
                class={cn(
                  "chat-bubble rounded-2xl relative group",
                  isSent ? "chat-bubble-sent" : "chat-bubble-received",
                  isFirstInGroup &&
                    (isSent ? "rounded-tr-none" : "rounded-tl-none"),
                  i > 0 && !isFirstInGroup ? "mt-1" : "mt-2",
                )}
              >
                <div class="relative">
                  <p
                    class="m-0 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap"
                  >
                    {msg.contentBody}<span class="inline-block w-11 h-0"></span>
                  </p>
                  <span
                    class="absolute bottom-0 right-[-4px] text-[9px] opacity-60 leading-none pb-0.5"
                  >
                    {formatSimpleTime(msg.createdAt)}
                  </span>
                </div>
                <MessageReactionPicker {msg} {isSent} />
                <!-- Reaction list for normal -->
                <div class="flex flex-col gap-1 items-start">
                  {@render reactionList(msg, isSent)}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    {/if}
  </div>

  {#snippet reactionList(msg: Message, isSent: boolean)}
    {#if msg.reactions && msg.reactions.length > 0}
      <div
        class={cn(
          "flex flex-wrap gap-1 mt-1",
          isSent ? "justify-end" : "justify-start",
        )}
      >
        {#each msg.reactions ?? [] as reaction}
          {@const hasReacted = reaction.users.includes(
            authStore.user?.id || "",
          )}
          {@const reactionStyles = hasReacted
            ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-500/30"
            : "bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"}
          <button
            onclick={() => chatStore.reactToMessage(msg.id, reaction.emoji)}
            class={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all active:scale-90 border shadow-xs",
              reactionStyles,
            )}
            title={reaction.users.length > 1
              ? `${reaction.users.length} reactions`
              : "1 reaction"}
          >
            <span class="text-sm">{reaction.emoji}</span>
            {#if reaction.users.length > 1}
              <span class="text-[10px] font-bold opacity-70 leading-none"
                >{reaction.users.length}</span
              >
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  {/snippet}

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

  <div class="p-4 glass-panel border-t flex gap-3 items-center relative z-40">
    <Popover bind:isOpen={showEmojiPicker} position="top" align="start">
      {#snippet trigger({ toggle })}
        <button
          class="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-600/10 transition-all active:scale-95 shrink-0"
          onclick={toggle}
          onmouseenter={prefetchEmojiPicker}
          aria-label="Open emoji picker"
          type="button"
        >
          <Icon name="smile" class="w-6 h-6" />
        </button>
      {/snippet}

      <EmojiPicker onSelect={insertEmoji} />
    </Popover>

    <textarea
      placeholder="Type a message..."
      class="input-field flex-1 rounded-2xl! pl-5 pr-3 py-2.5 resize-none max-h-32 scrollbar-slim"
      bind:value={messageInput}
      bind:this={textareaElement}
      onkeydown={handleKeydown}
      oninput={handleInput}
      disabled={chatStore.isSendingMessage}
      rows="1"
    ></textarea>
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

<style>
  :global([data-theme="dark"] emoji-picker) {
    color-scheme: dark;
  }

  .wrap-break-word {
    word-break: break-word;
    overflow-wrap: break-word;
  }
</style>
