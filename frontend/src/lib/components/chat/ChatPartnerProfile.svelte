<script lang="ts">
  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { tooltipStore } from "$state/tooltip.svelte";
  import type { UserDto } from "@shared/types/auth.dto";

  let {
    user,
    onClose,
  }: {
    user: UserDto | null;
    onClose: () => void;
  } = $props();

  let usernameCopied = $state(false);

  const handleCopyUsername = (e: MouseEvent) => {
    if (!user?.username) return;
    const textToCopy = `@${user.username}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      tooltipStore.showTemporary(
        "Username copied",
        e.currentTarget as HTMLElement,
      );
      usernameCopied = true;
      setTimeout(() => (usernameCopied = false), 2000);
    });
  };
</script>

<div class="h-full flex flex-col bg-white dark:bg-slate-900">
  <div
    class="panel-header flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5"
  >
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
      User Info
    </h2>
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
    <div
      class="flex flex-col gap-5 pt-4 border-t border-slate-100 dark:border-white/5"
    >
      <!-- Username -->
      <div class="flex flex-col gap-1.5">
        <span
          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
        >
          Username
        </span>
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
        <span
          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
        >
          Bio
        </span>
        <p
          class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap"
        >
          {user?.bio || "This user hasn't added a bio yet."}
        </p>
      </div>
    </div>
  </div>
</div>
