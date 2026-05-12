import { ApiError } from "$utils/errors";

export type ErrorType = "error" | "warning" | "info";

export interface AppError {
  id: string;
  message: string;
  type: ErrorType;
  status?: number;
  code?: string;
}

class ErrorStore {
  errors: AppError[] = $state([]);

  /**
   * Global handler for API errors.
   * Categorizes errors by status code and pushes appropriate UI alerts.
   */
  handleGlobalError(error: unknown) {
    if (!(error instanceof ApiError)) {
      console.error("[GlobalError] Unhandled non-API error:", error);
      return;
    }

    const { status, message, code } = error;

    // 1. Log to console for developers
    console.error(`[API ${status}] ${code || "ERROR"}: ${message}`);

    // 2. Determine user-facing message and type
    let displayMessage = message;
    let type: ErrorType = "error";

    switch (status) {
      case 401:
        // Handled by AuthStore (redirect to login), usually no alert needed
        return;
      case 403:
        displayMessage = "You don't have permission to perform this action.";
        break;
      case 429:
        displayMessage = "Too many requests. Please slow down.";
        type = "warning";
        break;
      case 500:
        displayMessage = "Server error. We've been notified and are looking into it.";
        break;
      case 503:
        displayMessage = "Service is temporarily unavailable. Please try again later.";
        break;
    }

    // 3. Push to store
    this.push(displayMessage, type, status, code || undefined);
  }

  /**
   * Push a new error to the store.
   * Returns a cleanup function to dismiss the error.
   */
  push(message: string, type: ErrorType = "error", status?: number, code?: string) {
    const id = crypto.randomUUID();
    const error: AppError = { id, message, type, status, code };

    this.errors = [...this.errors, error];

    // Auto-dismiss after 6 seconds if it's not a critical server error
    if (status !== 500 && status !== 503) {
      setTimeout(() => this.dismiss(id), 6000);
    }

    return () => this.dismiss(id);
  }

  dismiss(id: string) {
    this.errors = this.errors.filter((e) => e.id !== id);
  }

  clear() {
    this.errors = [];
  }
}

export const errorStore = new ErrorStore();
