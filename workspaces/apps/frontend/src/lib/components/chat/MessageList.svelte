<script lang="ts">
  import MessageBubble from "$components/chat/MessageBubble.svelte";
  import MessageSkeleton from "$components/chat/MessageSkeleton.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { MESSAGE_SKELETON_HEIGHT, SCROLL_THROTTLE_DURATION } from "$lib/config";
  import { messageStore } from "$state/active-chat.svelte";
  import { authStore } from "$state/auth.svelte";
  import type { ChatStatus } from "$lib/types/chat";
  import type { UserDto } from "shared/types/auth.dto";
  import type { MessageDto } from "shared/types/chat.dto";

  import { getDateLabel } from "$utils/date";
  import { throttle } from "$utils/timing";
  import { onMount, tick } from "svelte";

  let {
    chatId,
    otherUser,
    status,
    isTouchDevice,
    messageEditingId = $bindable(),
    editInputValue = $bindable(),
    editTextareaElement = $bindable(),
    startEditing,
    cancelEditing,
    saveEditing,
    handleEditKeydown,
    handleEditInput,
    showMessageActionsId = $bindable(),
  }: {
    chatId: string;
    otherUser: UserDto | null;
    status?: ChatStatus;
    isTouchDevice: boolean;
    messageEditingId: string | null;
    editInputValue: string;
    editTextareaElement: HTMLTextAreaElement | undefined;
    startEditing: (msg: MessageDto) => void;
    cancelEditing: () => void;
    saveEditing: (msgId: string) => void;
    handleEditKeydown: (e: KeyboardEvent, msgId: string) => void;
    handleEditInput: (e: Event) => void;
    showMessageActionsId: string | null;
  } = $props();

  let messagesContainer: HTMLDivElement | undefined = $state();
  let showJumpButton = $state(false);
  let userHasScrolledUp = $state(false);
  let windowContainerHeight = $state(0);

  const messageSkeletonCount = $derived(
    windowContainerHeight > 0 ? Math.ceil(windowContainerHeight / MESSAGE_SKELETON_HEIGHT) : 6,
  );

  // Group messages for better sticky header handling
  const groupedMessages = $derived.by(() => {
    const groups: { label: string; messages: MessageDto[] }[] = [];
    let lastLabel = "";

    for (const msg of messageStore.messages) {
      const label = getDateLabel(msg.createdAt);
      if (groups.length === 0 || label !== lastLabel) {
        groups.push({
          label,
          messages: [msg],
        });
        lastLabel = label;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  });

  export const scrollToBottom = (instant = false) => {
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: instant ? "instant" : "smooth",
      });
      showJumpButton = false;
      userHasScrolledUp = false;
    }
  };

  const JUMP_BUTTON_SHOW_THRESHOLD = 300;

  const handleMessagesScroll = throttle((e: Event) => {
    const target = e.target as HTMLDivElement;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isNearBottom = distanceFromBottom < 150;
    const scrolledUpSignificant = distanceFromBottom > JUMP_BUTTON_SHOW_THRESHOLD;

    showJumpButton = scrolledUpSignificant;
    userHasScrolledUp = !isNearBottom;
  }, SCROLL_THROTTLE_DURATION);

  // Auto-scroll when messages change
  let topSentinel: HTMLDivElement | undefined = $state();
  let loadingOlderObserver: IntersectionObserver | null = null;

  $effect(() => {
    if (!topSentinel || !messagesContainer || !chatId) return;
    if (loadingOlderObserver) loadingOlderObserver.disconnect();

    loadingOlderObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && messageStore.hasMoreMessages && !messageStore.isLoadingMessages) {
          const scrollBottom = messagesContainer!.scrollHeight - messagesContainer!.scrollTop;
          messageStore.loadOlderMessages().then(async () => {
            await tick();
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight - scrollBottom;
            }
          });
        }
      },
      {
        root: messagesContainer,
        rootMargin: "400px 0px 0px 0px",
      },
    );

    loadingOlderObserver.observe(topSentinel);
    return () => loadingOlderObserver?.disconnect();
  });

  // Export scroll to bottom for parent
  $effect(() => {
    if (messageStore.messages.length > 0 && !userHasScrolledUp) {
      scrollToBottom(true);
    }
  });

  // Use a resize observer to keep skeleton count accurate
  onMount(() => {
    if (!messagesContainer) return;
    const ro = new ResizeObserver((entries) => {
      windowContainerHeight = entries[0].contentRect.height;
    });
    ro.observe(messagesContainer);
    return () => ro.disconnect();
  });
</script>

<div class="flex-1 relative min-h-0">
  <div
    bind:this={messagesContainer}
    class="h-full overflow-y-auto p-4 md:p-6 scrollbar-slim"
    style="overflow-anchor: none;"
    onscroll={handleMessagesScroll}
  >
    {#if messageStore.isLoadingMessages && messageStore.messages.length === 0}
      <div class="flex flex-col gap-4">
        {#each Array(messageSkeletonCount) as _, i}
          <MessageSkeleton sent={i % 2 === 0} />
        {/each}
      </div>
    {:else if messageStore.messages.length === 0}
      <div class="flex flex-col items-center justify-center gap-4 h-full text-slate-500 opacity-60 text-center py-20">
        <div class="bg-slate-100 dark:bg-white/5 p-4 rounded-full">
          <Icon name="chat" class="w-10 h-10" />
        </div>
        <div>
          <p class="font-bold">No messages yet</p>
          <p class="text-sm">
            Start the conversation with {otherUser?.name || otherUser?.username}
          </p>
        </div>
      </div>
    {:else}
      <div bind:this={topSentinel} class="h-1 -mt-4"></div>

      {#if messageStore.isLoadingMessages && messageStore.hasMoreMessages}
        <div class="flex flex-col gap-4 mb-6">
          <MessageSkeleton sent={false} />
          <MessageSkeleton sent={true} />
        </div>
      {/if}

      {#each groupedMessages as group (group.label)}
        <div class="flex flex-col gap-1 mb-4 relative">
          <div class="sticky -top-4 z-20 flex justify-center pointer-events-none py-2 -mb-2">
            <span
              class="pointer-events-auto px-4 py-1 text-[10px] tracking-widest font-bold text-slate-500 bg-slate-50/90 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-full shadow-md backdrop-blur-md transition-all duration-300"
              >{group.label}</span
            >
          </div>
          <div
            class="before:content-[''] before:absolute before:top-5 before:left-0 before:right-0 before:h-px before:bg-slate-200 dark:before:bg-white/10 before:z-0"
          ></div>

          {#each group.messages as msg, i (msg.id)}
            {@const isSent = msg.senderId === authStore.user?.id}
            {@const isFirstInGroup = i === 0 || group.messages[i - 1].senderId !== msg.senderId}

            <MessageBubble
              {msg}
              {isSent}
              {otherUser}
              {isFirstInGroup}
              {i}
              {isTouchDevice}
              bind:messageEditingId
              bind:editInputValue
              bind:editTextareaElement
              {startEditing}
              {cancelEditing}
              {saveEditing}
              {handleEditKeydown}
              {handleEditInput}
              bind:showMessageActionsId
            />
          {/each}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Jump to Latest Button -->
  {#if showJumpButton}
    <button
      class="absolute bottom-6 right-6 md:right-8 bg-indigo-600 hover:bg-indigo-500 text-white w-10 h-10 rounded-full shadow-2xl flex items-center justify-center transition-all animate-in slide-in-from-bottom-8 fade-in duration-300 active:scale-90 z-30"
      onclick={() => scrollToBottom()}
      title="Jump to latest"
      aria-label="Scroll to bottom"
    >
      <div class="relative">
        <Icon name="chevrons-down" class="w-5 h-5" stroke-width="2.5" />
      </div>
    </button>
  {/if}
</div>
