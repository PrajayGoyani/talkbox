<script lang="ts">
  import { socketManager } from "$services/socket.manager.svelte";

  import EmojiPicker from "$components/chat/EmojiPicker.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import Popover from "$components/ui/Popover.svelte";
  import { messageStore } from "$state/active-chat.svelte";
  import type { ChatPartnerDto } from "shared/types/chat.dto";
  import { tick } from "svelte";

  import { uiStore } from "$state/ui.svelte";
  import { getDisallowedEmojis } from "$utils/emoji";
  import { authStore } from "$state/auth.svelte";

  let {
    chatId,
    otherUser,
    isTouchDevice,
    onSend,
  }: {
    chatId: string;
    otherUser: ChatPartnerDto | null;
    isTouchDevice: boolean;
    onSend?: () => void;
  } = $props();

  let messageInput = $state("");
  let currentChatId = $state("");
  let textareaElement: HTMLTextAreaElement | undefined = $state();
  let showEmojiPicker = $state(false);

  const encodeDraft = (text: string) => btoa(encodeURIComponent(text));
  const decodeDraft = (encoded: string) => decodeURIComponent(atob(encoded));

  $effect(() => {
    if (chatId && chatId !== currentChatId && authStore.user?.id) {
      currentChatId = chatId;
      const draft = localStorage.getItem(`chat_draft_${authStore.user.id}_${chatId}`);

      if (draft) {
        try {
          messageInput = decodeDraft(draft);
        } catch {
          // Fallback if the draft was saved as plaintext before encoding was added
          messageInput = draft;
        }
      } else {
        messageInput = "";
      }

      tick().then(adjustTextareaHeight);
    }
  });

  const adjustTextareaHeight = () => {
    if (!textareaElement) return;
    textareaElement.style.height = "auto";
    const newHeight = Math.min(textareaElement.scrollHeight, 128);
    textareaElement.style.height = `${newHeight}px`;
    textareaElement.style.overflowY = textareaElement.scrollHeight > 128 ? "auto" : "hidden";
  };

  $effect(() => {
    if (currentChatId && authStore.user?.id) {
      const draftKey = `chat_draft_${authStore.user.id}_${currentChatId}`;
      if (messageInput) {
        // Debounce saving to localStorage to avoid hitting disk on every keystroke
        const timeout = setTimeout(() => {
          localStorage.setItem(draftKey, encodeDraft(messageInput));
        }, 500);
        return () => clearTimeout(timeout);
      } else {
        // Clear immediately when input is emptied (e.g. after sending)
        localStorage.removeItem(draftKey);
      }
    }
  });

  const prefetchEmojiPicker = () => {
    import("emoji-picker-element").catch(() => {});
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !otherUser) return;

    const found = getDisallowedEmojis(messageInput.trim());
    if (found.length > 0) {
      uiStore.addAlert(`Message contains disallowed emojis (${found.join(", ")}). Please remove them.`, "danger");
      return;
    }

    messageStore.sendMessage(messageInput, otherUser.id);
    messageInput = "";
    tick().then(adjustTextareaHeight);
    onSend?.();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = () => {
    adjustTextareaHeight();

    if (chatId && otherUser?.id) {
      socketManager.emitTyping(chatId, otherUser.id, true);
    }
  };

  const insertEmoji = ({ emoji }: { emoji: string }) => {
    if (textareaElement) {
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      messageInput = messageInput.substring(0, start) + emoji + messageInput.substring(end);

      tick().then(() => {
        if (textareaElement) {
          textareaElement.selectionStart = textareaElement.selectionEnd = start + emoji.length;
          textareaElement.focus();
          handleInput();
        }
      });
    }
  };

  $effect(() => {
    if (textareaElement && chatId) {
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
    name="msg_input"
  ></textarea>

  <button
    class="bg-indigo-600 hover:bg-indigo-700 text-white w-9 h-9 md:w-10.5 md:h-10.5 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
    aria-label="Send message"
    onclick={handleSendMessage}
    disabled={!messageInput.trim()}
  >
    <Icon name="send" class="w-5 h-5" />
  </button>
</div>
