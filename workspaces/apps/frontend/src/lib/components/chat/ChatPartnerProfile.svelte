<script lang="ts">
  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { tooltipStore } from "$state/tooltip.svelte";
  import type { UserDto } from "shared/types/auth.dto";
  import type { Chat } from "$lib/types/chat";
  import { authStore } from "$state/auth.svelte";
  import { chatService } from "$services/chat.service";
  import { chatListStore } from "$state/chat/chat-list.svelte";
  import { uiStore } from "$state/ui.svelte";

  let {
    user,
    chat,
    onClose,
  }: {
    user: UserDto | null;
    chat: Chat | null;
    onClose: () => void;
  } = $props();

  let usernameCopied = $state(false);

  const handleCopyUsername = (e: MouseEvent) => {
    if (!user?.username) return;
    const textToCopy = `@${user.username}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      tooltipStore.showTemporary("Username copied", e.currentTarget as HTMLElement);
      usernameCopied = true;
      setTimeout(() => (usernameCopied = false), 2000);
    });
  };

  let isUpdatingRetention = $state(false);

  const handleRetentionChange = async (event: Event) => {
    if (!chat) return;
    const select = event.target as HTMLSelectElement;
    const rawVal = select.value;
    
    // Map "lifetime" to null
    const period = rawVal === "lifetime" ? null : parseInt(rawVal, 10);
    
    isUpdatingRetention = true;
    try {
      await chatService.updateRetentionPeriod(chat.id, period);
      chatListStore.patchChatLocally(chat.id, { retentionPeriod: period });
      uiStore.addAlert("Message retention period updated successfully!", "success");
    } catch (err: any) {
      uiStore.addAlert(err.message || "Failed to update retention period.", "danger");
      // Reset select value to previous state
      select.value = chat.retentionPeriod === null || chat.retentionPeriod === undefined ? "lifetime" : String(chat.retentionPeriod);
    } finally {
      isUpdatingRetention = false;
    }
  };
</script>

<div class="h-full flex flex-col bg-white dark:bg-slate-900">
  <div class="panel-header">
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">User Info</h2>
    <button
      onclick={onClose}
      class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-90"
      aria-label="Close panel"
    >
      <Icon name="close" class="w-5 h-5" />
    </button>
  </div>

  <div class="p-6 flex flex-col gap-6 overflow-y-auto">
    <!-- Avatar Section -->
    <div class="flex flex-col items-center gap-4">
      <Avatar
        {user}
        showBadge={true}
        class="w-24 h-24 text-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20"
      />
      <div class="text-center">
        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">
          {user?.name || user?.username}
        </h3>
        {#if user?.plan === "pro"}
          <span
            class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-linear-to-r from-indigo-600 to-purple-600 text-[10px] font-black text-white rounded uppercase tracking-tighter shadow-sm"
          >
            <Icon name="bolt" class="w-3 h-3" />
            Pro Member
          </span>
        {/if}
      </div>
    </div>

    <!-- Info List -->
    <div class="flex flex-col gap-5 pt-4 border-t border-slate-100 dark:border-white/5">
      <!-- Username -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"> Username </span>
        <div
          class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
        >
          <span class="font-mono text-sm text-indigo-600 dark:text-indigo-400">
            @{user?.username}
          </span>
          <button
            onclick={handleCopyUsername}
            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-600/10 transition-all active:scale-95"
            aria-label="Copy username"
          >
            <Icon
              name={usernameCopied ? "check" : "copy"}
              class="w-4 h-4 {usernameCopied ? 'text-emerald-500' : ''}"
              stroke-width={usernameCopied ? 3 : 2}
            />
          </button>
        </div>
      </div>

      <!-- Bio -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"> Bio </span>
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
          {user?.bio || "This user hasn't added a bio yet."}
        </p>
      </div>

      <!-- Conversation Settings -->
      {#if chat && chat.status === "accepted"}
        <div class="flex flex-col gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-2">
            <Icon name="clock" class="w-4.5 h-4.5 text-indigo-500" />
            <span class="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans">Conversation Settings</span>
          </div>

          <div class="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 font-sans">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Message Retention</span>
              <span class="text-[10px] text-slate-500 leading-normal">
                Automatically delete messages in this chat older than the selected period.
              </span>
            </div>

            <div class="relative mt-2">
              <select
                value={chat.retentionPeriod === null || chat.retentionPeriod === undefined ? "lifetime" : String(chat.retentionPeriod)}
                onchange={handleRetentionChange}
                disabled={isUpdatingRetention}
                class="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50 font-sans appearance-none"
              >
                <option value="1">1 Month</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                
                {#if authStore.user?.plan === "pro"}
                  <option value="lifetime">Lifetime (Unlimited History)</option>
                {:else}
                  <option value="lifetime" disabled>
                    Lifetime (Pro only) 🔒
                  </option>
                {/if}
              </select>

              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500 font-sans">
                {#if isUpdatingRetention}
                  <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                {:else}
                  <Icon name="chevron-down" class="w-4 h-4" />
                {/if}
              </div>
            </div>

            {#if authStore.user?.plan !== "pro"}
              <div class="mt-3 flex items-start gap-2 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950/30 rounded-xl">
                <span class="badge-pro select-none px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-linear-to-r from-indigo-600 to-purple-600 text-white shrink-0 mt-0.5">
                  PRO
                </span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                  Upgrade to a Pro account to set Lifetime retention and unlock unlimited chat history.
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
