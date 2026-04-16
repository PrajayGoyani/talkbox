<script lang="ts">
  import { onMount, tick } from "svelte";
  import Skeleton from "../ui/Skeleton.svelte";

  let { onSelect } = $props<{ onSelect: (emoji: string) => void }>();

  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // We use a promise to ensure we only load the heavy library once
  let loadingPromise: Promise<void> | null = null;

  async function loadLibrary() {
    if (loadingPromise) return loadingPromise;
    
    loadingPromise = (async () => {
      try {
        // Dynamic import triggers Vite to create a separate chunk
        await import("emoji-picker-element");
      } catch (e) {
        console.error("Failed to load emoji picker:", e);
        error = "Failed to load emoji picker";
        throw e;
      }
    })();
    
    return loadingPromise;
  }

  onMount(async () => {
    try {
      await loadLibrary();
      // Small delay to ensure the custom element is registered and ready to render
      await tick();
      isLoading = false;
    } catch (e) {
      isLoading = false;
    }
  });

  const handleEmojiClick = (event: any) => {
    if (onSelect) {
      onSelect(event.detail.unicode);
    }
  };
</script>

<div class="emoji-picker-container">
  {#if error}
    <div class="flex items-center justify-center h-full text-rose-500 text-sm p-4 text-center">
      {error}
    </div>
  {:else if isLoading}
    <div class="p-3 flex flex-col gap-3 w-[310px] h-[380px] max-w-full">
      <div class="flex gap-2 mb-2">
        {#each Array(8) as _}
          <Skeleton width="24px" height="24px" rounded="4px" />
        {/each}
      </div>
      <Skeleton width="100%" height="32px" rounded="8px" />
      <div class="grid grid-cols-8 gap-2 mt-2">
        {#each Array(32) as _}
          <Skeleton width="28px" height="28px" rounded="6px" />
        {/each}
      </div>
    </div>
  {:else}
    <emoji-picker
      class="light-theme"
      onemoji-click={handleEmojiClick}
    ></emoji-picker>
  {/if}
</div>

<style>
  .emoji-picker-container {
    width: 310px;
    height: 380px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: 640px) {
    .emoji-picker-container {
      width: 280px;
      height: 340px;
    }
  }

  emoji-picker {
    --num-columns: 8;
    --category-font-size: 0.875rem;
    --emoji-size: 1.5rem;
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 0;
  }

  @media (max-width: 640px) {
    emoji-picker {
      --num-columns: 7;
    }
  }

  /* Theme variables for emoji-picker-element */
  :global(emoji-picker) {
    --background: transparent;
    --border-color: rgba(0, 0, 0, 0.05);
    --button-hover-background: rgba(99, 102, 241, 0.1);
    --indicator-color: #4f46e5;
    --outline-color: #4f46e5;
    --input-font-color: #0f172a;
    --input-placeholder-color: #94a3b8;
    --category-font-color: #0f172a;
    font-family: inherit;
  }

  :global([data-theme="dark"] emoji-picker) {
    --background: transparent;
    --border-color: rgba(255, 255, 255, 0.05);
    --button-hover-background: rgba(99, 102, 241, 0.2);
    --indicator-color: #818cf8;
    --outline-color: #818cf8;
    --input-font-color: #f1f5f9;
    --input-placeholder-color: #64748b;
    --category-font-color: #f1f5f9;
    color-scheme: dark;
  }
</style>
