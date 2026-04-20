<script lang="ts">
  import EmojiPicker from "$components/chat/EmojiPicker.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import Popover from "$components/ui/Popover.svelte";
  import { chatStore, type Message } from "$state/chat.svelte";
  import { confirmStore } from "$state/confirm.svelte";
  import { tooltip } from "$state/tooltip.svelte";
  import { cn } from "$utils/cn";

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

  const handleDelete = async () => {
    const confirmed = await confirmStore.show({
      title: "Delete Message?",
      message:
        "Are you sure you want to delete this message? This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (confirmed) {
      chatStore.deleteMessage(msg.id);
    }
  };
</script>

<div
  class={cn(
    "absolute -top-4 transition-all duration-200 flex items-center gap-0.5 z-20 p-0.5 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-xl",
    isOpen
      ? "opacity-100 scale-100"
      : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100",
    isSent ? "-left-2 -translate-x-full" : "-right-2 translate-x-full",
  )}
>
  <Popover bind:isOpen position="top" align={isSent ? "end" : "start"}>
    {#snippet trigger({ toggle })}
      <button
        class={cn(
          "p-1 rounded-lg transition-all active:scale-90",
          isOpen
            ? "text-indigo-600 bg-indigo-600/10"
            : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-white/10",
        )}
        onclick={toggle}
        aria-label="Add reaction"
        use:tooltip={{ text: "Add reaction...", position: "top" }}
        type="button"
      >
        <Icon name="smile-plus" class="w-3.5 h-3.5" />
      </button>
    {/snippet}

    <EmojiPicker onSelect={handleSelect} />
  </Popover>

  {#if isSent && !msg.isDeleted}
    <button
      class="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
      onclick={handleDelete}
      aria-label="Delete message"
      use:tooltip={{ text: "Delete message", position: "top" }}
      type="button"
    >
      <Icon name="trash" class="w-3.5 h-3.5" />
    </button>
  {/if}
</div>
