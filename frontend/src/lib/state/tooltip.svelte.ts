export type TooltipPosition = "top" | "bottom" | "left" | "right";
export type TooltipVariant = "default" | "jumbo";

interface TooltipState {
  text: string;
  visible: boolean;
  x: number;
  y: number;
  position: TooltipPosition;
  variant: TooltipVariant;
}

class TooltipStore {
  #state = $state<TooltipState>({
    text: "",
    visible: false,
    x: 0,
    y: 0,
    position: "bottom",
    variant: "default",
  });

  #screenWidth = $state(typeof window !== "undefined" ? window.innerWidth : 0);

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", () => {
        this.#screenWidth = window.innerWidth;
      });
    }
  }

  get text() {
    return this.#state.text;
  }
  get visible() {
    return this.#state.visible;
  }
  get x() {
    return this.#state.x;
  }
  get y() {
    return this.#state.y;
  }
  get position() {
    return this.#state.position;
  }
  get variant() {
    return this.#state.variant;
  }
  get screenWidth() {
    return this.#screenWidth;
  }

  show(text: string, element: HTMLElement, position: TooltipPosition = "bottom", variant: TooltipVariant = "default") {
    if (!text) return;

    const rect = element.getBoundingClientRect();

    let x = 0;
    let y = 0;

    // Calculation logic for different positions (Viewport relative since components use 'fixed')
    if (position === "bottom") {
      x = rect.left + rect.width / 2;
      y = rect.bottom + 8;
    } else if (position === "top") {
      x = rect.left + rect.width / 2;
      y = rect.top - 8;
    } else if (position === "left") {
      x = rect.left - 8;
      y = rect.top + rect.height / 2;
    } else if (position === "right") {
      x = rect.right + 8;
      y = rect.top + rect.height / 2;
    }

    this.#state.text = text;
    this.#state.x = x;
    this.#state.y = y;
    this.#state.position = position;
    this.#state.variant = variant;
    this.#state.visible = true;
  }

  hide() {
    this.#state.visible = false;
  }

  /**
   * Helper for temporary tooltips (like 'Copied!')
   */
  async showTemporary(text: string, element: HTMLElement, duration = 2000, variant: TooltipVariant = "default") {
    this.show(text, element, "bottom", variant);
    await new Promise((resolve) => setTimeout(resolve, duration));
    // Only hide if the text hasn't changed (prevents conflicting tooltips)
    if (this.#state.text === text) {
      this.hide();
    }
  }
}

export const tooltipStore = new TooltipStore();

/**
 * Svelte 5 action to trigger tooltips
 * Usage: <button use:tooltip={"Your text"}>
 * Usage: <button use:tooltip={{ text: "Your text", position: "top", variant: "jumbo" }}>
 */
export function tooltip(
  node: HTMLElement,
  options: string | { text: string; position?: TooltipPosition; variant?: TooltipVariant },
) {
  let text = typeof options === "string" ? options : options.text;
  let position = typeof options === "object" ? options.position || "bottom" : "bottom";
  let variant = typeof options === "object" ? options.variant || "default" : "default";

  let touchTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleMouseEnter = () => {
    if (touchTimeout) clearTimeout(touchTimeout);
    tooltipStore.show(text, node, position, variant);
  };

  const handleMouseLeave = () => {
    tooltipStore.hide();
  };

  const handleTouchStart = (_e: TouchEvent) => {
    // Prevent mouse events from firing after touch
    // e.preventDefault(); // Might break scrolling if not careful

    if (touchTimeout) clearTimeout(touchTimeout);

    tooltipStore.show(text, node, position, variant);

    // Auto-hide after 2.5 seconds on mobile
    touchTimeout = setTimeout(() => {
      tooltipStore.hide();
    }, 2500);
  };

  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mouseleave", handleMouseLeave);
  node.addEventListener("touchstart", handleTouchStart, { passive: true });

  return {
    update(
      newOptions:
        | string
        | {
            text: string;
            position?: TooltipPosition;
            variant?: TooltipVariant;
          },
    ) {
      text = typeof newOptions === "string" ? newOptions : newOptions.text;
      position = typeof newOptions === "object" ? newOptions.position || "bottom" : "bottom";
      variant = typeof newOptions === "object" ? newOptions.variant || "default" : "default";
    },
    destroy() {
      if (touchTimeout) clearTimeout(touchTimeout);
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
      node.removeEventListener("touchstart", handleTouchStart);
      tooltipStore.hide();
    },
  };
}
