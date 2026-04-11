<script lang="ts">
  import { tooltipStore } from "../state/tooltip.svelte";
  import { fade } from "svelte/transition";

  const getTranslate = $derived.by(() => {
    const { position } = tooltipStore;
    if (position === "top") return "translate(-50%, -100%)";
    if (position === "bottom") return "translate(-50%, 0)";
    if (position === "left") return "translate(-100%, -50%)";
    if (position === "right") return "translate(0, -50%)";
    return "translate(-50%, 0)";
  });
</script>

{#if tooltipStore.visible && tooltipStore.text}
  <div
    class="fixed z-[9999] pointer-events-none"
    style="left: {tooltipStore.x}px; top: {tooltipStore.y}px; transform: {getTranslate}"
    transition:fade={{ duration: 150 }}
  >
    <div
      class="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 
             px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-xl 
             backdrop-blur-md border border-white/10 dark:border-black/5
             whitespace-nowrap tracking-tight"
    >
      {tooltipStore.text}
    </div>
  </div>
{/if}
