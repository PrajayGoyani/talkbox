/**
 * Global confirmation dialog state management
 */

class ConfirmStore {
  isOpen = $state(false);
  title = $state("");
  message = $state("");
  confirmText = $state("Confirm");
  cancelText = $state("Cancel");
  variant = $state<"info" | "danger" | "warning">("info");

  #onConfirm: (() => void) | null = null;
  #onCancel: (() => void) | null = null;

  show(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "info" | "danger" | "warning";
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this.title = options.title;
      this.message = options.message;
      this.confirmText = options.confirmText ?? "Confirm";
      this.cancelText = options.cancelText ?? "Cancel";
      this.variant = options.variant ?? "info";
      this.isOpen = true;

      this.#onConfirm = () => {
        this.isOpen = false;
        resolve(true);
      };

      this.#onCancel = () => {
        this.isOpen = false;
        resolve(false);
      };
    });
  }

  confirm() {
    this.#onConfirm?.();
  }

  cancel() {
    this.#onCancel?.();
  }
}

export const confirmStore = new ConfirmStore();
