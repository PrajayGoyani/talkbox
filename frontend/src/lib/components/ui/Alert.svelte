<script lang="ts">
  import { fly } from "svelte/transition";
  import { uiStore, type AlertData } from "../../state/ui.svelte";
  import Icon from "./Icon.svelte";

  const { alert } = $props<{
    alert: AlertData;
  }>();

  const isDanger = $derived(alert.type === "danger");
</script>

<div
  class="pointer-events-auto flex items-center gap-3 p-4 rounded-2xl min-w-[320px] max-w-[450px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]
         backdrop-blur-2xl border transition-all duration-300 group
         {isDanger 
           ? 'bg-rose-500/90 dark:bg-rose-600/90 border-rose-400/30' 
           : 'bg-emerald-500/90 dark:bg-emerald-600/90 border-emerald-400/30'}"
  in:fly={{ y: -50, duration: 500, opacity: 0 }}
  out:fly={{ y: -20, duration: 300, opacity: 0 }}
>
  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 shrink-0 text-white shadow-inner">
    <Icon name={isDanger ? "close" : "check"} class="w-6 h-6" stroke-width="2.5" />
  </div>

  <div class="flex flex-col flex-1 min-w-0">
    <span class="text-xs uppercase tracking-widest font-black text-white/60 mb-0.5">
      {isDanger ? "Action Rejected" : "Success"}
    </span>
    <p class="text-[15px] font-bold text-white leading-tight">
      {alert.message}
    </p>
  </div>

  <button
    class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
    onclick={() => uiStore.removeAlert(alert.id)}
    aria-label="Dismiss"
  >
    <Icon name="close" class="w-4 h-4" />
  </button>
</div>

<style>
  div {
    transform-origin: top center;
  }
</style>
