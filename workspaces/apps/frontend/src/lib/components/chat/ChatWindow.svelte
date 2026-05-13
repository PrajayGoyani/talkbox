<script lang="ts">
  import { presenceStore } from "$state/chat/presence.svelte";
  import { socketManager } from "$services/socket.manager.svelte";

  import ChatHeader from "$components/chat/ChatHeader.svelte";
  import ChatInput from "$components/chat/ChatInput.svelte";
  import MessageList from "$components/chat/MessageList.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { messageStore } from "$state/active-chat.svelte";
  import { authStore } from "$state/auth.svelte";
  import type { ChatStatus } from "$lib/types/chat";
  import type { ChatPartnerDto, MessageDto } from "shared/types/chat.dto";
  import { tick } from "svelte";

  let {
    chatId,
    otherUser,
    status,
    onBack,
  }: {
    chatId: string;
    otherUser: ChatPartnerDto | null;
    status: ChatStatus;
    onBack: () => void;
  } = $props();

  let isTouchDevice = $state(false);
  let messageEditingId = $state<string | null>(null);
  let editInputValue = $state("");
  let editTextareaElement: HTMLTextAreaElement | undefined = $state();
  let showMessageActionsId = $state<string | null>(null);
  let messageList: any = $state();

  const partnerStatus = $derived(presenceStore.onlineStatus.get(otherUser?.id || ""));
  const chatTypingUsers = $derived(presenceStore.typingStatus.get(chatId));

  const handleEditInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  const startEditing = (msg: MessageDto) => {
    messageEditingId = msg.id;
    editInputValue = msg.contentBody;
    tick().then(() => {
      if (editTextareaElement) {
        editTextareaElement.focus();
        handleEditInput({ target: editTextareaElement } as any);
      }
    });
  };

  const cancelEditing = () => {
    messageEditingId = null;
    editInputValue = "";
  };

  const saveEditing = async (msgId: string) => {
    const msg = messageStore.messages.find((m: MessageDto) => m.id === msgId);

    if (!msg || editInputValue.trim() === msg.contentBody) {
      cancelEditing();
      return;
    }

    try {
      await socketManager.editMessage(msgId, editInputValue.trim());
      cancelEditing();
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  };

  const handleEditKeydown = (e: KeyboardEvent, msgId: string) => {
    if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
      e.preventDefault();
      saveEditing(msgId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  $effect(() => {
    isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
  });

  // Global click handler to close message actions on touch
  $effect(() => {
    const handleClick = () => {
      if (showMessageActionsId) showMessageActionsId = null;
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  });

  // Cleanup message store when the window is closed
  $effect(() => {
    return () => {
      messageStore.destroy();
    };
  });
</script>

<ChatHeader {otherUser} {status} {partnerStatus} {onBack} />

{#if status === "pending"}
  <div class="flex-1 p-6 flex flex-col items-center justify-center text-center">
    <div class="bg-amber-500/10 p-6 rounded-full mb-4">
      <Icon name="clock" class="w-12 h-12 text-amber-500" />
    </div>
    <h2 class="text-xl font-bold mb-2">Request Pending</h2>
    <p class="text-slate-500 max-w-xs">
      You need to wait for {otherUser?.name || otherUser?.username} to accept your chat request.
    </p>
  </div>
{:else}
  <MessageList
    bind:this={messageList}
    {chatId}
    {otherUser}
    {status}
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

  {#if (chatTypingUsers?.size ?? 0) > 0}
    {#if !chatTypingUsers?.has(authStore.user?.id || "") || (chatTypingUsers?.size ?? 0) > 1}
      <div class="px-6 pb-2">
        <span class="text-xs text-slate-500 italic">
          {otherUser?.name || otherUser?.username} is typing...
        </span>
      </div>
    {/if}
  {/if}

  <ChatInput {chatId} {otherUser} {isTouchDevice} onSend={() => messageList?.scrollToBottom()} />
{/if}

<style>
  :global([data-theme="dark"] emoji-picker) {
    color-scheme: dark;
  }
</style>
