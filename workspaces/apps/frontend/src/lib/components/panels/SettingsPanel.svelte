<script lang="ts">
  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { settingsStore } from "$state/settings.svelte";
  import { themeStore } from "$state/theme.svelte";
  import { SHOW_DEBUG_SETTINGS } from "$lib/config";
  import { socketManager } from "$services/socket.manager.svelte";
  import { playNotificationSound } from "$utils/audio";
  import { cn } from "$utils/cn";
  import type { UserDto } from "shared/types/auth.dto";

  const { onLogout, user } = $props<{
    onLogout?: () => void;
    user?: UserDto | null;
  }>();

  let currentTheme = $derived(themeStore.theme);
  let soundEnabled = $derived(settingsStore.soundEnabled);

  function toggleTheme() {
    themeStore.toggleTheme();
  }

  function toggleSound() {
    settingsStore.toggleSound();
  }

  function testSound() {
    playNotificationSound(true);
  }
</script>

<div class="h-full flex flex-col">
  <div class="panel-header">
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Settings</h2>
  </div>

  <div class="p-4 flex flex-col gap-3 overflow-y-auto">
    <!-- Theme Toggle -->
    <div
      class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
    >
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</span>
        <span class="text-xs text-slate-500">Switch between dark and light mode</span>
      </div>
      <button
        type="button"
        class={[
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
          currentTheme === "dark" ? "bg-indigo-600" : "bg-slate-400",
        ]}
        onclick={toggleTheme}
        aria-label="Toggle theme"
      >
        <span
          class={[
            "pointer-events-none relative flex h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out items-center justify-center text-slate-400",
            currentTheme === "dark" ? "translate-x-0" : "translate-x-5",
          ]}
        >
          {#if currentTheme === "dark"}
            <Icon name="moon" class="w-3 h-3 text-indigo-600" />
          {:else}
            <Icon name="sun" class="w-3 h-3 text-amber-500" />
          {/if}
        </span>
      </button>
    </div>

    <hr class="border-t border-slate-200 dark:border-white/10 my-1" />

    <!-- Notification Sound Toggle -->
    <div
      class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
    >
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">Notification Sound</span>
        <span class="text-xs text-slate-500">Play a sound for incoming messages</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition-all active:scale-90"
          onclick={testSound}
          title="Play test sound"
          aria-label="Play test sound"
        >
          <Icon name="bolt" class="w-4 h-4" />
        </button>
        <button
          type="button"
          class={[
            "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
            soundEnabled ? "bg-indigo-600" : "bg-slate-400",
          ]}
          onclick={toggleSound}
          aria-label="Toggle notification sound"
        >
          <span
            class={[
              "pointer-events-none relative flex h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out items-center justify-center text-slate-400",
              soundEnabled ? "translate-x-5" : "translate-x-0",
            ]}
          >
            {#if soundEnabled}
              <Icon name="notifications" class="w-3 h-3 text-indigo-600" />
            {:else}
              <Icon name="notifications" class="w-3 h-3 text-slate-400" />
            {/if}
          </span>
        </button>
      </div>
    </div>

    {#if SHOW_DEBUG_SETTINGS}
      <hr class="border-t border-slate-200 dark:border-white/10 my-1" />

      <!-- Simulate Failure (Testing Only) -->
      <div
        class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
      >
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 italic">Simulate Send Failure</span>
          <span class="text-xs text-slate-500">Enable to test optimistic failure UI</span>
        </div>
        <button
          type="button"
          class={[
            "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2",
            socketManager.simulateFailure ? "bg-rose-600" : "bg-slate-400",
          ]}
          onclick={() => (socketManager.simulateFailure = !socketManager.simulateFailure)}
          aria-label="Toggle simulate failure"
        >
          <span
            class={[
              "pointer-events-none relative flex h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out items-center justify-center text-slate-400",
              socketManager.simulateFailure ? "translate-x-5" : "translate-x-0",
            ]}
          >
            <Icon
              name="alert-circle"
              class={cn("w-3 h-3", socketManager.simulateFailure ? "text-rose-600" : "text-slate-400")}
            />
          </span>
        </button>
      </div>

      <hr class="border-t border-slate-200 dark:border-white/10 my-1" />
    {/if}

    <!-- <div
      class="flex items-center justify-between p-3 rounded-xl opacity-50 cursor-not-allowed"
    >
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >Privacy</span
        >
        <span class="text-xs text-slate-500"
          >Manage who can send you chat requests</span
        >
      </div>
      <span
        class="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded uppercase font-bold tracking-wider"
        >Coming Soon</span
      >
    </div> -->

    <!-- Mobile-only User section and Logout -->
    <div class="flex flex-col gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/10 md:hidden">
      <div class="px-1 flex items-center gap-3">
        <Avatar
          {user}
          class="w-12 h-12 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-2 border-white dark:border-slate-800"
        />
        <div class="flex flex-col">
          <span class="text-base font-bold text-slate-900 dark:text-slate-100">{user?.name || user?.username}</span>
          <span class="text-xs text-slate-500">@{user?.username}</span>
        </div>
      </div>

      <button
        class="w-full mt-2 flex items-center justify-center gap-2 p-3.5 rounded-xl bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/20 transition-all active:scale-[0.98]"
        onclick={onLogout}
      >
        <Icon name="logout" class="w-[18px] h-[18px]" />
        Sign Out
      </button>
    </div>
  </div>
</div>
