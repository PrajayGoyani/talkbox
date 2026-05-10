<script lang="ts">
  import { tooltipStore } from "$state/tooltip.svelte";
  import { fade } from "svelte/transition";

  // Split lines for rendering
  const lines = $derived(tooltipStore.text.split("\n"));

  const getTranslate = $derived.by(() => {
    const { position } = tooltipStore;
    if (position === "top") return "translate(-50%, -100%)";
    if (position === "bottom") return "translate(-50%, 0)";
    if (position === "left") return "translate(-100%, -50%)";
    if (position === "right") return "translate(0, -50%)";
    return "translate(-50%, 0)";
  });

  let tooltipWidth = $state(0);

  // Clamp left position to prevent being cut off at screen edges
  const leftPos = $derived.by(() => {
    const x = tooltipStore.x;
    const margin = 12;
    const screenWidth = tooltipStore.screenWidth;

    // If we don't know the width yet, use a safe default
    if (tooltipWidth === 0) return x;

    // The tooltip is translated -50%, so its left edge is x - width/2
    // We want left edge >= margin AND right edge <= screenWidth - margin
    const minX = tooltipWidth / 2 + margin;
    const maxX = screenWidth - tooltipWidth / 2 - margin;

    return Math.max(minX, Math.min(x, maxX));
  });
</script>

{#if tooltipStore.visible && tooltipStore.text && tooltipStore.variant === "jumbo"}
  <div
    bind:clientWidth={tooltipWidth}
    class="fixed z-9999 pointer-events-none"
    style="left: {leftPos}px; top: {tooltipStore.y}px; transform: {getTranslate}"
    transition:fade={{ duration: 150 }}
  >
    <div
      class="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900
             px-4 py-2.5 rounded-2xl text-[13px] font-semibold shadow-2xl
             backdrop-blur-xl border border-white/10 dark:border-black/5
             whitespace-pre-line tracking-tight leading-relaxed
             w-max max-w-70 text-center flex flex-col items-center gap-1"
    >
      {#each lines as line, i}
        {#if i === 0}
          <span class="text-3xl mb-1 mt-0.5 drop-shadow-sm">{line}</span>
        {:else}
          <span class="text-center">{line}</span>
        {/if}
      {/each}
    </div>
  </div>
{/if}
