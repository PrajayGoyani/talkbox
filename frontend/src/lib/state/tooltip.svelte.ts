import { tick } from "svelte";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipState {
  text: string;
  visible: boolean;
  x: number;
  y: number;
  position: TooltipPosition;
}

class TooltipStore {
  #state = $state<TooltipState>({
    text: "",
    visible: false,
    x: 0,
    y: 0,
    position: "bottom",
  });

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

  show(text: string, element: HTMLElement, position: TooltipPosition = "bottom") {
    if (!text) return;

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let x = 0;
    let y = 0;

    // Calculation logic for different positions
    if (position === "bottom") {
      x = rect.left + rect.width / 2 + scrollX;
      y = rect.bottom + 8 + scrollY;
    } else if (position === "top") {
      x = rect.left + rect.width / 2 + scrollX;
      y = rect.top - 8 + scrollY;
    } else if (position === "left") {
      x = rect.left - 8 + scrollX;
      y = rect.top + rect.height / 2 + scrollY;
    } else if (position === "right") {
      x = rect.right + 8 + scrollX;
      y = rect.top + rect.height / 2 + scrollY;
    }

    this.#state.text = text;
    this.#state.x = x;
    this.#state.y = y;
    this.#state.position = position;
    this.#state.visible = true;
  }

  hide() {
    this.#state.visible = false;
  }

  /**
   * Helper for temporary tooltips (like 'Copied!')
   */
  async showTemporary(text: string, element: HTMLElement, duration = 2000) {
    this.show(text, element, "bottom");
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
 */
export function tooltip(node: HTMLElement, options: string | { text: string; position?: TooltipPosition }) {
  let text = typeof options === "string" ? options : options.text;
  let position = typeof options === "object" ? options.position : "bottom";

  const handleMouseEnter = () => {
    tooltipStore.show(text, node, position);
  };

  const handleMouseLeave = () => {
    tooltipStore.hide();
  };

  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mouseleave", handleMouseLeave);

  return {
    update(newOptions: string | { text: string; position?: TooltipPosition }) {
      text = typeof newOptions === "string" ? newOptions : newOptions.text;
      position = typeof newOptions === "object" ? newOptions.position : "bottom";
    },
    destroy() {
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
      tooltipStore.hide();
    },
  };
}
