<script lang="ts">
  import { onMount, untrack, type Snippet } from "svelte";

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
  let contentWidth = $state(0);

  let effectivePosition = $state(untrack(() => position));
  const toggle = () => (isOpen = !isOpen);

  // Sync effectivePosition when the prop changes
  $effect(() => {
    effectivePosition = position;
  });

  const calculateVerticalPosition = (rect: DOMRect) => {
    let nextPosition = position;
    if (position === "top" && rect.top < 420) {
      return "bottom";
    }
    if (position === "bottom" && window.innerHeight - rect.bottom < 420) {
      return "top";
    }
    return nextPosition;
  };

  const calculateHorizontalOffset = (rect: DOMRect, initialLeft: number) => {
    if (contentWidth <= 0) return 0;

    const margin = 12;
    const screenWidth = window.innerWidth;
    let offset = 0;

    if (align === "center") {
      const leftEdge = initialLeft - contentWidth / 2;
      const rightEdge = initialLeft + contentWidth / 2;
      if (leftEdge < margin) offset = margin - leftEdge;
      else if (rightEdge > screenWidth - margin)
        offset = screenWidth - margin - rightEdge;
    } else if (align === "start") {
      const rightEdge = initialLeft + contentWidth;
      if (rightEdge > screenWidth - margin)
        offset = screenWidth - margin - rightEdge;
    } else if (align === "end") {
      const leftEdge = initialLeft - contentWidth;
      if (leftEdge < margin) offset = margin - leftEdge;
    }

    return offset;
  };

  const updatePosition = () => {
    if (!triggerElement || !isOpen) return;
    const rect = triggerElement.getBoundingClientRect();

    // 1. Determine vertical placement (smart detection)
    const nextPosition = calculateVerticalPosition(rect);
    if (nextPosition !== effectivePosition) {
      effectivePosition = nextPosition;
    }

    // 2. Determine initial horizontal anchor
    const initialLeft =
      align === "center"
        ? rect.left + rect.width / 2
        : align === "start"
          ? rect.left
          : rect.right;

    // 3. Calculate horizontal offset to prevent screen overflow
    const hOffset = calculateHorizontalOffset(rect, initialLeft);

    // 4. Set final coordinates
    const nextTop = effectivePosition === "top" ? rect.top : rect.bottom;
    const nextLeft = initialLeft + hOffset;

    // Jitter protection
    if (
      Math.abs(coords.top - nextTop) > 0.5 ||
      Math.abs(coords.left - nextLeft) > 0.5
    ) {
      coords = { top: nextTop, left: nextLeft };
    }
  };

  // Centralized effect for positioning
  $effect(() => {
    // Only track isOpen and contentWidth
    if (isOpen) {
      // Accessing contentWidth here ensures the effect re-runs when it changes
      const _width = contentWidth;

      // Perform the update untracked to prevent infinite loops from reading coords
      untrack(() => updatePosition());
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
      bind:clientWidth={contentWidth}
      class="fixed z-9999 animate-in fade-in duration-200 transition-opacity"
      style:top="{coords.top}px"
      style:left="{coords.left}px"
      style:transform="translate({align === 'center'
        ? '-50%'
        : align === 'start'
          ? '0'
          : '-100%'}, {effectivePosition === 'top'
        ? 'calc(-100% - 12px)'
        : '12px'})"
    >
      <div
        class="glass-panel overflow-hidden rounded-2xl border border-slate-200/50 shadow-2xl dark:border-white/10"
      >
        {@render children()}
      </div>
    </div>
  {/if}
</div>
