<script lang="ts">
  import { tick } from "svelte";
  import EmojiPicker from "$components/chat/EmojiPicker.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import Popover from "$components/ui/Popover.svelte";
  import { chatStore, type User } from "$state/chat.svelte";
  import { uiStore } from "$state/ui.svelte";
  import { getDisallowedEmojis } from "$utils/emoji";

  let {
    chatId,
    otherUser,
    isTouchDevice,
    onSend
  }: {
    chatId: string;
    otherUser: User | null;
    isTouchDevice: boolean;
    onSend?: () => void;
  } = $props();

  let messageInput = $state("");
  let textareaElement: HTMLTextAreaElement | undefined = $state();
  let showEmojiPicker = $state(false);

  const prefetchEmojiPicker = () => {
    import("emoji-picker-element").catch(() => {});
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || chatStore.isSendingMessage || !otherUser) return;

    const found = getDisallowedEmojis(messageInput.trim());
    if (found.length > 0) {
      uiStore.addAlert(
        `Message contains disallowed emojis (${found.join(", ")}). Please remove them.`,
        "danger",
      );
      return;
    }

    chatStore.sendMessage(chatId, otherUser.id, messageInput);
    messageInput = "";
    if (textareaElement) {
      textareaElement.style.height = "auto";
      textareaElement.style.overflowY = "hidden";
    }
    onSend?.();
  };

  const handleKeydown = (e: KeyboardEvent) => {
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

  const insertEmoji = ({ emoji }: { emoji: string }) => {
    if (textareaElement) {
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      messageInput =
        messageInput.substring(0, start) + emoji + messageInput.substring(end);

      tick().then(() => {
        if (textareaElement) {
          textareaElement.selectionStart = textareaElement.selectionEnd =
            start + emoji.length;
          textareaElement.focus();
          handleInput({ target: textareaElement } as any);
        }
      });
    }
  };

  $effect(() => {
    if (!chatStore.isSendingMessage && textareaElement && chatId) {
      tick().then(() => {
        textareaElement?.focus();
      });
    }
  });
</script>

<div class="p-2.5 md:p-4 glass-panel border-t flex gap-2 md:gap-3 items-center relative z-40">
  <Popover bind:isOpen={showEmojiPicker} position="top" align="start">
    {#snippet trigger({ toggle })}
      <button
        class="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 md:p-2 rounded-xl hover:bg-indigo-600/10 transition-all active:scale-95 shrink-0"
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
    class="input-field flex-1 rounded-2xl! pl-3 md:pl-5 pr-3 py-1.5 md:py-2.5 resize-none max-h-32 scrollbar-slim text-sm md:text-base leading-tight md:leading-normal"
    bind:value={messageInput}
    bind:this={textareaElement}
    onkeydown={handleKeydown}
    oninput={handleInput}
    rows="1"
  ></textarea>

  <button
    class="bg-indigo-600 hover:bg-indigo-700 text-white w-9 h-9 md:w-[42px] md:h-[42px] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
    aria-label="Send message"
    onclick={handleSendMessage}
    disabled={!messageInput.trim() || chatStore.isSendingMessage}
  >
    {#if chatStore.isSendingMessage}
      <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
    {:else}
      <Icon name="send" class="w-5 h-5" />
    {/if}
  </button>
</div>
