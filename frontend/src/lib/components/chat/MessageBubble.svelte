<script lang="ts">
  import MessageReactionPicker from "$components/chat/MessageReactionPicker.svelte";
  import { authStore } from "$state/auth.svelte";
  import { chatStore, type Message, type User } from "$state/chat.svelte";
  import { tooltip } from "$state/tooltip.svelte";
  import { cn } from "$utils/cn";
  import { formatSimpleTime } from "$utils/date";
  import { getEmojiDisplayMode, parseMessageContent } from "$utils/emoji";

  type Props = {
    msg: Message;
    isSent: boolean;
    otherUser: User | null;
    isFirstInGroup: boolean;
    i: number;
    isTouchDevice: boolean;
    messageEditingId: string | null;
    editInputValue: string;
    editTextareaElement: HTMLTextAreaElement | undefined;
    startEditing: (msg: Message) => void;
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
      i > 0 && !isFirstInGroup ? "mt-1" : "mt-3",
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
        "flex flex-wrap gap-1 items-center px-1 rounded-2xl transition-all relative",
        {
          "text-5xl md:text-6xl": emojiDisplayMode === "jumbo-1",
          "text-4xl md:text-5xl": emojiDisplayMode === "jumbo-2",
          "text-3xl md:text-4xl": emojiDisplayMode !== "jumbo-2",
        },
        showMessageActionsId === msg.id &&
          "bg-slate-100 dark:bg-white/5 ring-4 ring-slate-100 dark:ring-white/5",
      )}
    >
      {#each parseMessageContent(msg.contentBody, msg.emojiMetadata) as segment}
        {#if segment.type === "emoji"}
          <span
            use:tooltip={{
              text: segment.content + "\n:" + segment.name + ":",
              variant: "jumbo",
              position: "top",
            }}
            class="hover:scale-110 transition-transform cursor-default"
          >
            {segment.content}
          </span>
        {/if}
      {/each}

      <div
        class={cn(
          "absolute flex items-center gap-2",
          isSent ? "right-0 -bottom-5" : "left-0 -bottom-5",
        )}
      >
        <span class="text-[9px] font-medium whitespace-nowrap opacity-70">
          {formatSimpleTime(msg.createdAt)}
          {#if msg.isEdited && !msg.isDeleted}
            <span class="ml-1 opacity-50 italic">(edited)</span>
          {/if}
        </span>
        {#if !msg.isDeleted && !msg.isScrubbed}
          <div class="flex items-center gap-1">
            <MessageReactionPicker
              {msg}
              {isSent}
              onEdit={() => startEditing(msg)}
            />
          </div>
        {/if}
      </div>

      <!-- Reactions rendering for jumbo -->
      {@render reactionList(msg, isSent, otherUser, chatStore, authStore)}
    </div>
  </div>
{:else}
  <!-- Normal Message Bubble -->
  <div
    class={cn(
      "chat-bubble rounded-2xl relative group",
      isSent ? "chat-bubble-sent" : "chat-bubble-received",
      isFirstInGroup && (isSent ? "rounded-tr-none" : "rounded-tl-none"),
      i > 0 && !isFirstInGroup ? "mt-1" : "mt-2",
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
      if (
        (e.key === "Enter" || e.key === " ") &&
        isTouchDevice &&
        !msg.isDeleted &&
        !msg.isScrubbed
      ) {
        showMessageActionsId = showMessageActionsId === msg.id ? null : msg.id;
      }
    }}
  >
    <div class="relative group/content">
      {#if messageEditingId === msg.id}
        <div class="flex flex-col gap-2 min-w-[200px] py-1">
          <textarea
            bind:value={editInputValue}
            bind:this={editTextareaElement}
            class="w-full bg-transparent border-none focus:ring-0 outline-none resize-none text-sm leading-relaxed p-0 scrollbar-none shadow-none"
            onkeydown={(e) => handleEditKeydown(e, msg.id)}
            oninput={handleEditInput}
            rows="1"
          ></textarea>
          <div class="flex justify-end gap-3 mt-1">
            <button
              onclick={cancelEditing}
              class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-white/40 dark:hover:text-white/70 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onclick={() => saveEditing(msg.id)}
              class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-500/10 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      {:else}
        <p
          class={cn(
            "m-0 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap",
            (msg.isDeleted || msg.isScrubbed) && "italic opacity-80",
          )}
        >
          {#each parseMessageContent(msg.contentBody, msg.emojiMetadata) as segment}
            {#if segment.type === "emoji"}
              <span
                class="cursor-default inline-block align-middle px-0.5"
                use:tooltip={{
                  text: segment.content + "\n:" + segment.name + ":",
                  variant: "jumbo",
                  position: "top",
                }}>{segment.content}</span
              >
            {:else if segment.type === "link"}
              <a
                href={segment.url}
                target="_blank"
                rel="noopener noreferrer"
                class="chat-link"
                onclick={(e) => e.stopPropagation()}
              >
                {segment.content}
              </a>
            {:else if segment.type === "code"}
              <code class="chat-code">{segment.content}</code>
            {:else}
              {segment.content}
            {/if}
          {/each}<span
            class={["inline-block h-0", msg.isEdited ? "w-[84px]" : "w-11"]}
          ></span>
        </p>
        <span
          class="absolute bottom-0 right-[-4px] text-[9px] opacity-60 leading-none pb-0.5 whitespace-nowrap flex items-center"
        >
          {formatSimpleTime(msg.createdAt)}
          {#if msg.isEdited && !msg.isDeleted}
            <span class="ml-1 opacity-50 italic">(edited)</span>
          {/if}
        </span>
      {/if}
    </div>
    {#if !msg.isDeleted && !msg.isScrubbed}
      <MessageReactionPicker {msg} {isSent} onEdit={() => startEditing(msg)} />
    {/if}
    <!-- Reaction list for normal -->
    <div class="flex flex-col gap-1 items-start">
      {@render reactionList(msg, isSent, otherUser, chatStore, authStore)}
    </div>
  </div>
{/if}

{#snippet reactionList(
  msg: Message,
  isSent: boolean,
  otherUser: User | null,
  chatStore: any,
  authStore: any,
)}
  {#if msg.reactions && msg.reactions.length > 0}
    <div
      class={cn(
        "flex flex-wrap gap-1 mt-1",
        isSent ? "justify-end" : "justify-start",
      )}
    >
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
            chatStore.reactToMessage(msg.id, reaction.emoji, reaction.slug);
          }}
          use:tooltip={{
            text: msg.isScrubbed ? "Upgrade to Pro to react" : tooltipContent,
            position: "top",
            variant: "jumbo",
          }}
          class={cn(
            "flex items-center gap-1 px-1.5 py-1 md:py-0.5 rounded-full text-xs transition-all active:scale-90 border shadow-xs",
            reactionStyles,
          )}
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
