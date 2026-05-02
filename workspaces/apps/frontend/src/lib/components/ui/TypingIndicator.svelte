<script lang="ts">
  import { cn } from "$utils/cn";

  let { class: className = "" } = $props<{ class?: string }>();
</script>

<div
  class={cn(
    "flex items-center gap-1 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-full w-min",
    className,
  )}
>
  <span class="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
  <span class="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
  <span class="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
</div>

<style>
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    50% {
      transform: translateY(-2px);
      opacity: 1;
    }
  }

  .animate-bounce {
    animation: bounce 0.8s infinite ease-in-out;
  }
</style>
