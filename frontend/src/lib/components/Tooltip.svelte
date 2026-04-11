<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    text,
    children,
  }: {
    text: string;
    children: Snippet;
  } = $props();

  let show = $state(false);
</script>

<div
  class="relative inline-block"
  onmouseenter={() => (show = true)}
  onmouseleave={() => (show = false)}
>
  {@render children()}

  {#if show && text}
    <div
      class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 text-[11px] font-bold text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200 z-50 pointer-events-none"
    >
      {text}
    </div>
  {/if}
</div>
