<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import { uiStore } from "$state/ui.svelte";
  import { Route } from "$utils/routes";
  import { fade } from "svelte/transition";
</script>

<div
  class="flex flex-col items-center justify-center p-8 text-center h-full max-w-lg mx-auto"
  in:fade={{ duration: 400, delay: 200 }}
>
  <div class="relative mb-8 group">
    <!-- Animated glow background -->
    <div
      class="absolute -inset-8 bg-linear-to-tr from-indigo-500/20 via-sky-500/10 to-transparent blur-3xl rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-700"
    ></div>
    <div class="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full animate-pulse"></div>

    <!-- Icon Container -->
    <div
      class="relative bg-white dark:bg-slate-800 p-8 rounded-4xl shadow-2xl border border-slate-200 dark:border-white/10 active:scale-95 transition-all duration-500 hover:scale-[102.5%]"
    >
      <Icon name="nav-chat" class="w-16 h-16 text-indigo-600 dark:text-indigo-400 drop-shadow-lg" />
    </div>
  </div>

  <h2
    class="text-3xl font-extrabold mb-3 tracking-tight bg-linear-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent"
  >
    Talkbox
  </h2>

  <p class="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed text-base max-w-[400px]">
    Pick a conversation from sidebar or start a new one.
  </p>

  <div class="grid grid-cols-2 gap-4 w-full max-w-sm">
    <button
      onclick={() => uiStore.navigate(Route.CHAT + "/conversations")}
      class="glass-panel p-5 rounded-3xl flex flex-col items-center gap-3 hover:bg-indigo-600/5 transition-all group active:scale-95 border border-transparent hover:border-indigo-500/20"
    >
      <div
        class="p-3 rounded-2xl bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
      >
        <Icon name="add" class="w-6 h-6" />
      </div>
      <span class="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">New Chat</span>
    </button>

    <button
      onclick={() => uiStore.navigate(Route.CHAT + "/profile")}
      class="glass-panel p-5 rounded-3xl flex flex-col items-center gap-3 hover:bg-slate-600/5 transition-all group active:scale-95 border border-transparent hover:border-slate-500/20"
    >
      <div
        class="p-3 rounded-2xl bg-slate-600/10 text-slate-600 group-hover:bg-slate-800 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all shadow-sm"
      >
        <Icon name="profile" class="w-6 h-6" />
      </div>
      <span class="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100"
        >Your Profile</span
      >
    </button>
  </div>
</div>
