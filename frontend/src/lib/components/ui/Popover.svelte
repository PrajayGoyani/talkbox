<script lang="ts">
  import { onMount, tick, type Snippet } from "svelte";

  let {
    children,
    trigger,
    isOpen = $bindable(false),
    position = "top", // top, bottom
    align = "center", // center, end
    class: className = "",
  }: {
    children: Snippet;
    trigger: Snippet<[{ toggle: () => void }]>;
    isOpen?: boolean;
    position?: "top" | "bottom";
    align?: "center" | "end" | "start";
    class?: string;
  } = $props();

  let popoverContent: HTMLDivElement | undefined = $state();
  let triggerElement: HTMLDivElement | undefined = $state();
  let coords = $state({ top: 0, left: 0 });

  const toggle = () => (isOpen = !isOpen);

  const updatePosition = () => {
    if (!triggerElement) return;
    const rect = triggerElement.getBoundingClientRect();

    coords = {
      top: position === "top" ? rect.top : rect.bottom,
      left:
        align === "center"
          ? rect.left + rect.width / 2
          : align === "start"
            ? rect.left
            : rect.right,
    };
  };

  // Update position whenever it opens
  $effect(() => {
    if (isOpen) {
      tick().then(updatePosition);
    }
  });

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    if (
      isOpen &&
      popoverContent &&
      !popoverContent.contains(target) &&
      triggerElement &&
      !triggerElement.contains(target)
    ) {
      isOpen = false;
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isOpen) {
      isOpen = false;
    }
  };

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    updatePosition();
    return {
      destroy: () => node.remove(),
    };
  }

  onMount(() => {
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  });
</script>

<div class="relative inline-flex {className}" bind:this={triggerElement}>
  {@render trigger({ toggle })}

  {#if isOpen}
    <div
      use:portal
      bind:this={popoverContent}
      class="fixed z-[9999] animate-in fade-in zoom-in-95 duration-200"
      style:top="{coords.top}px"
      style:left="{coords.left}px"
      style:transform="translate({align === 'center'
        ? '-50%'
        : align === 'start'
          ? '0'
          : '-100%'}, {position === 'top' ? 'calc(-100% - 12px)' : '12px'})"
    >
      <div
        class="glass-panel overflow-hidden rounded-2xl border border-slate-200/50 shadow-2xl dark:border-white/10"
      >
        {@render children()}
      </div>
    </div>
  {/if}
</div>
