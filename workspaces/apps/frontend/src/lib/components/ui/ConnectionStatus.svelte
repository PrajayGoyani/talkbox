<script lang="ts">
  import { socketManager } from "$services/socket.manager.svelte";
  import { slide } from "svelte/transition";
  import Icon from "$components/ui/Icon.svelte";

  let lastConnected = $state(socketManager.isConnected);
  let showBanner = $state(!socketManager.isConnected);
  let status = $state<"connected" | "disconnected">(!socketManager.isConnected ? "disconnected" : "connected");
  let dismissTimeout: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const isConnected = socketManager.isConnected;
    if (isConnected !== lastConnected) {
      if (isConnected) {
        status = "connected";
        showBanner = true;
        // Auto dismiss after 3 seconds
        if (dismissTimeout) clearTimeout(dismissTimeout);
        dismissTimeout = setTimeout(() => {
          showBanner = false;
        }, 3000);
      } else {
        status = "disconnected";
        showBanner = true;
        if (dismissTimeout) clearTimeout(dismissTimeout);
      }
      lastConnected = isConnected;
    }
  });
</script>

{#if showBanner}
  <div
    transition:slide={{ duration: 300 }}
    class={`relative overflow-hidden border-b px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium backdrop-blur-md transition-all duration-500 z-40 ${
      status === "connected"
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
        : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
    }`}
  >
    <!-- Background premium pulse gradients -->
    {#if status === "disconnected"}
      <div class="absolute inset-0 bg-linear-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 opacity-70 animate-pulse-slow -z-10"></div>
    {/if}

    {#if status === "connected"}
      <Icon name="check" class="w-4 h-4 shrink-0 animate-scale-in text-emerald-500" />
      <span>Connected back online! All pending messages synced.</span>
    {:else}
      <Icon name="loader" class="w-4 h-4 shrink-0 animate-spin text-amber-500" />
      <span>You are offline. Outbox active — messages will sync when connection returns.</span>
    {/if}
  </div>
{/if}

<style>
  @keyframes pulse-slow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @keyframes scale-in {
    0% { transform: scale(0.7); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  :global(.animate-pulse-slow) {
    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  :global(.animate-scale-in) {
    animation: scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
</style>
