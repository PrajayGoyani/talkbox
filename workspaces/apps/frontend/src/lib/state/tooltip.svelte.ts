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
  let startX = 0;
  let startY = 0;
  const MOVE_THRESHOLD = 12; // px
  const LONG_PRESS_DURATION = 500; // ms

  const isTouchDevice = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const handleMouseEnter = () => {
    if (isTouchDevice()) return;
    tooltipStore.show(text, node, position, variant);
  };

  const handleMouseLeave = () => {
    if (isTouchDevice()) return;
    tooltipStore.hide();
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;

    if (touchTimeout) clearTimeout(touchTimeout);

    touchTimeout = setTimeout(() => {
      tooltipStore.show(text, node, position, variant);
      if (window.navigator.vibrate) {
        window.navigator.vibrate(40);
      }
      // Add global listener for light dismiss
      window.addEventListener("touchstart", handleGlobalTouch, { capture: true });
    }, LONG_PRESS_DURATION);
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - startX);
    const diffY = Math.abs(touch.clientY - startY);

    if (diffX > MOVE_THRESHOLD || diffY > MOVE_THRESHOLD) {
      if (touchTimeout) clearTimeout(touchTimeout);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimeout) clearTimeout(touchTimeout);
  };

  const handleGlobalTouch = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    // If tapping outside the node, hide the tooltip
    if (!node.contains(target)) {
      tooltipStore.hide();
      window.removeEventListener("touchstart", handleGlobalTouch, { capture: true });
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    // Prevent system context menu if we're showing a tooltip via long-press
    if (isTouchDevice() && tooltipStore.visible && tooltipStore.text === text) {
      e.preventDefault();
    }
  };

  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mouseleave", handleMouseLeave);
  node.addEventListener("touchstart", handleTouchStart, { passive: true });
  node.addEventListener("touchmove", handleTouchMove, { passive: true });
  node.addEventListener("touchend", handleTouchEnd);
  node.addEventListener("contextmenu", handleContextMenu);

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
      const oldText = text;
      text = typeof newOptions === "string" ? newOptions : newOptions.text;
      position = typeof newOptions === "object" ? newOptions.position || "bottom" : "bottom";
      variant = typeof newOptions === "object" ? newOptions.variant || "default" : "default";

      if (tooltipStore.visible && tooltipStore.text === oldText && text !== oldText) {
        tooltipStore.show(text, node, position, variant);
      }
    },
    destroy() {
      if (touchTimeout) clearTimeout(touchTimeout);
      window.removeEventListener("touchstart", handleGlobalTouch, { capture: true });
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("contextmenu", handleContextMenu);
      tooltipStore.hide();
    },
  };
}
