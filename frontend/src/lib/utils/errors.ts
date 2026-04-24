import { uiStore } from "$state/ui.svelte";

/**
 * Standardized API error class that captures HTTP status and backend error codes.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  details: any;

  constructor(message: string, status: number, code: string | null = null, details: any = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;

    // Ensure the prototype is set correctly for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static async fromResponse(resp: Response) {
    let message = "An unexpected error occurred";
    let code: string | null = null;
    let details: any = null;

    try {
      const body = await resp.json();
      message = body.error?.message || body.message || message;
      code = body.error?.code || body.code || null;
      details = body.error?.details || body.details || null;
    } catch (e) {
      // Body is not JSON or empty
      message = resp.statusText || message;
    }

    return new ApiError(message, resp.status, code, details);
  }

  /**
   * Centralized handling for 429 Too Many Requests errors.
   * Returns true if the error was handled.
   */
  static handleRateLimit(error: unknown, customMessage?: string): boolean {
    if (error instanceof ApiError && error.status === 429) {
      uiStore.addAlert(
        customMessage || error.message || "You are doing that too fast. Please wait a minute.",
        "danger",
      );
      return true;
    }
    return false;
  }
}
