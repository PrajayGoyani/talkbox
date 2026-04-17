<script lang="ts">
  import { chatStore, type Message } from "../../state/chat.svelte";
  import { tooltip } from "../../state/tooltip.svelte";
  import { cn } from "../../utils/cn";
  import EmojiPicker from "../chat/EmojiPicker.svelte";
  import Icon from "../ui/Icon.svelte";
  import Popover from "../ui/Popover.svelte";

  let {
    msg,
    isSent,
  }: {
    msg: Message;
    isSent: boolean;
  } = $props();

  let isOpen = $state(false);

  const handleSelect = (emoji: string) => {
    chatStore.reactToMessage(msg.id, emoji);
    isOpen = false;
  };
</script>

<div
  class={cn(
    "absolute -top-3 transition-opacity flex items-center gap-1 z-10",
    isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
    isSent ? "-left-8" : "-right-8",
  )}
>
  <Popover bind:isOpen position="top" align={isSent ? "end" : "start"}>
    {#snippet trigger({ toggle })}
      <button
        class={cn(
          "p-1.5 rounded-lg transition-all active:scale-90",
          isOpen
            ? "text-indigo-600 bg-indigo-600/10"
            : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-white/10",
        )}
        onclick={toggle}
        aria-label="Add reaction"
        use:tooltip={{ text: "Add reaction...", position: "top" }}
        type="button"
      >
        <Icon name="smile-plus" class="w-4 h-4" />
      </button>
    {/snippet}

    <EmojiPicker onSelect={handleSelect} />
  </Popover>
</div>
