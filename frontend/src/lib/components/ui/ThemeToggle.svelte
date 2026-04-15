<script lang="ts">
  import { themeStore } from "../../state/theme.svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { quintOut, cubicOut } from "svelte/easing";

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 256 256"
            aria-hidden="true"
          >
            <path
              d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"
            />
          </svg>
        {:else}
          <!-- Moon Icon - transition-colors group-hover:text-indigo-600 -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
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
