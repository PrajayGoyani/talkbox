<script lang="ts">
  import { socketManager } from "$services/socket.manager.svelte";

  import MessageReactionPicker from "$components/chat/MessageReactionPicker.svelte";
  import { authStore } from "$state/auth.svelte";

  import { tooltip } from "$state/tooltip.svelte";
  import { cn } from "$utils/cn";
  import { formatSimpleTime } from "$utils/date";
  import { getEmojiDisplayMode, parseMessageContent, type MessageSegment } from "$utils/emoji";
  import type { UserDto } from "shared/types/auth.dto";
  import type { MessageDto } from "shared/types/chat.dto";

  type Props = {
    msg: MessageDto;
    isSent: boolean;
    otherUser: UserDto | null;
    isFirstInGroup: boolean;
    i: number;
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
  };

  let {
    msg,
    isSent,
    otherUser,
    isFirstInGroup,
    i,
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
  }: Props = $props();

  const emojiDisplayMode = $derived(getEmojiDisplayMode(msg.contentBody));
</script>

{#if emojiDisplayMode !== "normal" && !msg.isDeleted && !msg.isScrubbed}
  <!-- Jumbo Emoji Mode -->
  <div
    class={cn(
      "flex flex-col relative group max-w-[85%] md:max-w-[70%]",
      isSent ? "items-end ml-auto" : "items-start",
      i > 0 && !isFirstInGroup ? "mt-2" : "mt-3",
    )}
    role="button"
    tabindex="0"
    onclick={() => {
      if (isTouchDevice) {
        showMessageActionsId = showMessageActionsId === msg.id ? null : msg.id;
      }
    }}
    onkeydown={(e) => {
      if ((e.key === "Enter" || e.key === " ") && isTouchDevice) {
        showMessageActionsId = showMessageActionsId === msg.id ? null : msg.id;
      }
    }}
  >
    <div
      class={cn(
        "flex flex-wrap gap-1 items-center px-1 py-2 rounded-2xl transition-all relative",
        {
          "text-5xl md:text-6xl": emojiDisplayMode === "jumbo-1",
          "text-4xl md:text-5xl": emojiDisplayMode === "jumbo-2",
          "text-3xl md:text-4xl": emojiDisplayMode !== "jumbo-1" && emojiDisplayMode !== "jumbo-2",
        },
        showMessageActionsId === msg.id && "bg-slate-100 dark:bg-white/5 ring-4 ring-slate-100 dark:ring-white/5",
      )}
    >
      {#if !msg.isDeleted && !msg.isScrubbed}
        <MessageReactionPicker {msg} {isSent} {isTouchDevice} />
      {/if}
      {#each parseMessageContent(msg.contentBody, msg.emojiMetadata) as segment}
        {#if segment.type === "emoji"}
          {@render renderSegment(segment, true)}
        {/if}
      {/each}
    </div>
    <div class={cn("px-2.5 py-1 mt-1 flex items-center min-w-0")}>
      <span class="text-[9px] font-medium whitespace-nowrap opacity-70">
        {formatSimpleTime(msg.createdAt)}
      </span>
    </div>

    <!-- Reactions rendering for jumbo -->
    <div class="flex flex-col gap-1 items-start">
      {@render reactionList(msg, isSent, otherUser, authStore)}
    </div>
  </div>
{:else}
  <!-- Normal Message Bubble -->
  <div
    class={cn(
      "chat-bubble rounded-2xl group",
      isSent ? "chat-bubble-sent" : "chat-bubble-received",
      isFirstInGroup && (isSent ? "rounded-tr-none" : "rounded-tl-none"),
      i > 0 && !isFirstInGroup ? "mt-2" : "mt-3",
      (msg.isDeleted || msg.isScrubbed) && "opacity-60",
    )}
    role="button"
    tabindex="0"
    onclick={() => {
      if (isTouchDevice && !msg.isDeleted && !msg.isScrubbed) {
        showMessageActionsId = showMessageActionsId === msg.id ? null : msg.id;
      }
    }}
    onkeydown={(e) => {
      if ((e.key === "Enter" || e.key === " ") && isTouchDevice && !msg.isDeleted && !msg.isScrubbed) {
        showMessageActionsId = showMessageActionsId === msg.id ? null : msg.id;
      }
    }}
  >
    <div class="relative">
      {#if messageEditingId === msg.id}
        <div class="grid w-full py-1 min-w-0">
          <!-- Invisible mirror for width/height preservation -->
          <div
            class="invisible pointer-events-none row-start-1 col-start-1 m-0 text-sm leading-relaxed break-words whitespace-pre-wrap py-0 min-w-0"
            aria-hidden="true"
          >
            {editInputValue}<span class="inline-block w-11"></span>
          </div>
          <div class="row-start-1 col-start-1 flex flex-col gap-2 w-full min-w-0">
            <textarea
              bind:value={editInputValue}
              bind:this={editTextareaElement}
              class="w-full bg-transparent border-none focus:ring-0 outline-none resize-none text-sm leading-relaxed p-0 scrollbar-none shadow-none break-words"
              onkeydown={(e) => handleEditKeydown(e, msg.id)}
              oninput={handleEditInput}
              rows="1"
            ></textarea>
            <div class="flex justify-end gap-2 mt-2">
              <button
                onclick={cancelEditing}
                class="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-white/10 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onclick={() => saveEditing(msg.id)}
                class="px-4 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      {:else}
        <p
          class={cn(
            "m-0 text-sm leading-relaxed break-words whitespace-pre-wrap",
            (msg.isDeleted || msg.isScrubbed) && "italic opacity-80",
          )}
        >
          {#each parseMessageContent(msg.contentBody, msg.emojiMetadata) as segment}
            {@render renderSegment(segment)}
          {/each}<span class={["inline-block h-0", msg.isEdited && !msg.isDeleted ? "w-21" : "w-11"]}></span>
        </p>
        <span
          class="absolute bottom-0 -right-1 text-[9px] opacity-60 leading-none pb-0.5 whitespace-nowrap flex items-center"
        >
          {formatSimpleTime(msg.createdAt)}
          {#if msg.isEdited && !msg.isDeleted}
            <span class="ml-1 opacity-50 italic">(edited)</span>
          {/if}
        </span>
      {/if}
    </div>
    {#if !msg.isDeleted && !msg.isScrubbed}
      <MessageReactionPicker {msg} {isSent} {isTouchDevice} onEdit={() => startEditing(msg)} />
    {/if}
    <!-- Reaction list for normal -->
    <div class="flex flex-col gap-1 items-start">
      {@render reactionList(msg, isSent, otherUser, authStore)}
    </div>
  </div>
{/if}

{#snippet reactionList(msg: MessageDto, isSent: boolean, otherUser: UserDto | null, authStore: any)}
  {#if msg.reactions && msg.reactions.length > 0}
    <div class={cn("flex flex-wrap gap-1 mt-1", isSent ? "justify-end" : "justify-start")}>
      {#each msg.reactions as reaction}
        {@const hasReacted = reaction.users.includes(authStore.user?.id || "")}
        {@const reactionStyles = hasReacted
          ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-500/30"
          : "bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"}
        {@const reactorNames = reaction.users.map((id) => {
          if (id === authStore.user?.id) return "You";
          if (id === otherUser?.id) return otherUser.name || otherUser.username;
          return "Someone";
        })}
        {@const displaySlug = reaction.slug ? `:${reaction.slug}:` : ":emoji:"}
        {@const tooltipContent = `${reaction.emoji}\n${reactorNames.join(", ")}${hasReacted ? " (click to remove)" : ""} reacted with ${displaySlug}`}

        <button
          onclick={() => {
            if (msg.isScrubbed) return;
            socketManager.reactToMessage(msg.id, reaction.emoji, reaction.slug);
          }}
          use:tooltip={{
            text: msg.isScrubbed ? "Upgrade to Pro to react" : tooltipContent,
            position: "top",
            variant: "jumbo",
          }}
          class={cn(
            "flex items-center gap-1 px-1.5 py-1 md:py-0.5 rounded-full text-xs transition-all active:scale-90 border shadow-sm",
            reactionStyles,
          )}
        >
          <span class="text-sm">{reaction.emoji}</span>
          {#if reaction.users.length > 1}
            <span class="text-[10px] font-bold opacity-70 leading-none">{reaction.users.length}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet renderEmoji(segment: MessageSegment, isJumbo = false)}
  <span
    class={cn(isJumbo ? "select-none" : "cursor-default inline-block align-middle px-0.5")}
    use:tooltip={{
      text: ":" + segment.name + ":",
      variant: "default",
      position: "top",
    }}>{segment.content}</span
  >
{/snippet}

{#snippet renderLink(segment: MessageSegment)}
  <a
    href={segment.url}
    target="_blank"
    rel="noopener noreferrer"
    class="chat-link"
    onclick={(e) => e.stopPropagation()}
  >
    {segment.content}
  </a>
{/snippet}

{#snippet renderCode(segment: MessageSegment)}
  <code class="chat-code">{segment.content}</code>
{/snippet}

{#snippet renderText(segment: MessageSegment)}
  {segment.content}
{/snippet}

{#snippet renderSegment(segment: MessageSegment, isJumbo = false)}
  {@const renderers = {
    emoji: renderEmoji,
    link: renderLink,
    code: renderCode,
    text: renderText,
  }}
  {@const Renderer = renderers[segment.type] || renderText}
  {@render Renderer(segment, isJumbo)}
{/snippet}
