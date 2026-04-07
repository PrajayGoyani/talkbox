<script lang="ts">
  import { storage, type Theme } from "../utils/storage";
  import type { UserDto } from "../types/auth.dto";
  import Avatar from "./Avatar.svelte";

  const { onLogout, user } = $props<{
    onLogout?: () => void;
    user?: UserDto | null;
  }>();

  let currentTheme = $state<Theme>(storage.getTheme());

  function applyTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme);
    storage.setTheme(theme);
  }

  function toggleTheme() {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
  }
</script>

<div class="h-full flex flex-col">
  <div class="panel-header">
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
      Settings
    </h2>
  </div>

  <div class="p-4 flex flex-col gap-3 overflow-y-auto">
    <!-- Theme Toggle -->
    <div
      class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
    >
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >Theme</span
        >
        <span class="text-xs text-slate-500"
          >Switch between dark and light mode</span
        >
      </div>
      <button
        type="button"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 {currentTheme ===
        'dark'
          ? 'bg-indigo-600'
          : 'bg-slate-400'}"
        onclick={toggleTheme}
        aria-label="Toggle theme"
      >
        <span
          class="pointer-events-none relative flex h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out items-center justify-center {currentTheme ===
          'dark'
            ? 'translate-x-0'
            : 'translate-x-5'} text-slate-400"
        >
          {#if currentTheme === "dark"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              class="text-indigo-600"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              class="text-amber-500"
            >
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          {/if}
        </span>
      </button>
    </div>

    <hr class="border-t border-slate-200 dark:border-white/10 my-1" />

    <!-- Placeholder sections -->
    <div
      class="flex items-center justify-between p-3 rounded-xl opacity-50 cursor-not-allowed"
    >
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >Notification Sound</span
        >
        <span class="text-xs text-slate-500"
          >Play a sound for incoming messages</span
        >
      </div>
      <span
        class="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded uppercase font-bold tracking-wider"
        >Coming Soon</span
      >
    </div>

    <div
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
    </div>

    <!-- Mobile-only User section and Logout -->
    <div class="flex flex-col gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/10 md:hidden">
      <div class="px-1 flex items-center gap-3">
        <Avatar {user} class="w-12 h-12 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-2 border-white dark:border-slate-800" />
        <div class="flex flex-col">
          <span class="text-base font-bold text-slate-900 dark:text-slate-100">{user?.name || user?.username}</span>
          <span class="text-xs text-slate-500">@{user?.username}</span>
        </div>
      </div>
      
      <button 
        class="w-full mt-2 flex items-center justify-center gap-2 p-3.5 rounded-xl bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/20 transition-all active:scale-[0.98]"
        onclick={onLogout}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        Sign Out
      </button>
    </div>
  </div>
</div>
