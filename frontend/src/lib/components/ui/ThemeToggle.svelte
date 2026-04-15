<script lang="ts">
  import { themeStore } from "../../state/theme.svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { quintOut, cubicOut } from "svelte/easing";
  import Icon from "./Icon.svelte";

  let { class: className = "" } = $props();
</script>

<button
  onclick={() => themeStore.toggleTheme()}
  class="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 text-slate-600 dark:text-slate-400 group active:scale-95 overflow-hidden {className}"
  aria-label="Toggle Theme"
>
  <div class="relative w-5 h-5 flex items-center justify-center">
    {#key themeStore.theme}
      <div
        class="absolute"
        in:fly={{ y: 20, duration: 500, easing: quintOut }}
        out:fly={{ y: -20, duration: 500, easing: quintOut }}
      >
        {#if themeStore.theme === "light"}
          <!-- Sun Icon - transition-colors group-hover:text-amber-500 -->
          <Icon name="sun" class="w-5 h-5" />
        {:else}
          <!-- Moon Icon - transition-colors group-hover:text-indigo-600 -->
          <Icon name="moon" class="w-5 h-5" />
        {/if}
      </div>
    {/key}
  </div>
</button>

<style>
  /* Optional: Add a subtle glow for the sun in dark mode */
  :global([data-theme="dark"]) button:hover svg {
    filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4));
  }
</style>
