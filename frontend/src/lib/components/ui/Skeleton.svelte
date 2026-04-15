<script lang="ts">
  let {
    width = "100%",
    height = "1rem",
    rounded = "0.5rem",
    class: className = "",
  } = $props();
</script>

<div
  class="skeleton {className}"
  style:width
  style:height
  style:border-radius={rounded}
></div>

<style>
  .skeleton {
    position: relative;
    overflow: hidden;
    background-color: #e2e8f0; /* slate-200 */
  }

  :global(.dark) .skeleton {
    background-color: rgba(255, 255, 255, 0.05);
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
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0)
    );
    animation: shimmer 2s infinite;
  }

  :global(.dark) .skeleton::after {
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.05) 20%,
      rgba(255, 255, 255, 0.1) 60%,
      rgba(255, 255, 255, 0)
    );
  }

  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
</style>
