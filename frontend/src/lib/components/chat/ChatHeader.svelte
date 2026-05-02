<script lang="ts">
  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import type { ChatStatus } from "$state/chat.svelte";
  import { tooltip } from "$state/tooltip.svelte";
  import { uiStore } from "$state/ui.svelte";
  import { formatTimeAgo } from "$utils/date";
  import type { UserDto } from "@shared/types/auth.dto";

  let {
    otherUser,
    status,
    partnerStatus,
    onBack,
  }: {
    otherUser: UserDto | null;
    status?: ChatStatus;
    partnerStatus:
      | { isOnline: boolean; lastSeen: string | Date | null }
      | undefined;
    onBack?: () => void;
  } = $props();

  let copied = $state(false);

  const handleCopyUsername = async (e: MouseEvent) => {
    if (!otherUser?.username) return;
    try {
      await navigator.clipboard.writeText(otherUser.username);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      console.error("Failed to copy username:", err);
    }
  };
</script>

<div class="glass-panel p-2.5 md:p-4 border-b shrink-0 z-50">
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
      onclick={() => (uiStore.isSidebarCollapsed = !uiStore.isSidebarCollapsed)}
      aria-label="Toggle Sidebar"
    >
      <Icon name="sidebar" class="w-5 h-5" />
    </button>

    <Avatar
      user={otherUser}
      showBadge={true}
      class="w-9 h-9 bg-indigo-500 text-white text-sm"
    />

    <div class="flex flex-col min-w-0 font-sans">
      <div class="flex items-center gap-2">
        <h3
          class="m-0 text-base md:text-lg font-semibold leading-none truncate"
          title="@{otherUser?.username}"
        >
          {otherUser?.name || otherUser?.username}
        </h3>
        {#if otherUser?.plan === "pro"}
          <span
            class="badge-pro select-none px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-sm ring-1 ring-white/20"
          >
            PRO
          </span>
        {/if}
        <button
          use:tooltip={{
            text: copied ? "Copied!" : "Copy username",
            position: "right",
          }}
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
          {#if partnerStatus?.isOnline}
            <span
              class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            ></span><span class="text-xs text-emerald-500 font-medium"
              >Online</span
            >
          {:else if partnerStatus?.lastSeen}
            <span class="text-xs text-slate-500">
              Active {formatTimeAgo(partnerStatus.lastSeen)}
            </span>
          {:else}
            <span class="text-xs text-slate-500">Offline</span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Info Panel Toggle -->
    <button
      onclick={() => uiStore.toggleChatInfo()}
      class={[
        "p-2 rounded-lg transition-all active:scale-90 ml-auto shrink-0",
        uiStore.chatInfoOpen
          ? "text-indigo-600 bg-indigo-600/10"
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10",
      ]}
      aria-label="User profile info"
      use:tooltip={{ text: "User Info", position: "left" }}
    >
      <Icon name="info" class="w-5 h-5" />
    </button>
  </div>
</div>
