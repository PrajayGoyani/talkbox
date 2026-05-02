<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import { themeStore } from "$state/theme.svelte";
  import { quintOut } from "svelte/easing";
  import { fly } from "svelte/transition";

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
