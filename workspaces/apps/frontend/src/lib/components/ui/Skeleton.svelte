<script lang="ts">
  import { cn } from "$utils/cn";
  let { width = "100%", height = "1rem", rounded = "0.5rem", class: className = "" } = $props();
</script>

<div class={cn("skeleton", className)} style:width style:height style:border-radius={rounded}></div>

<style>
  .skeleton {
    position: relative;
    overflow: hidden;
    background-color: #e2e8f0; /* slate-200 */
  }

  :global([data-theme="dark"]) .skeleton {
    background-color: rgba(255, 255, 255, 0.08); /* slightly brighter base for dark mode */
  }

  .skeleton::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.3) 30%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0.3) 70%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 1.8s infinite linear;
  }

  :global([data-theme="dark"]) .skeleton::after {
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.06) 20%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.06) 80%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
</style>
