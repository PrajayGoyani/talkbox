/**
 * Standardized API error class that captures HTTP status and backend error codes.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  details: any;
  url: string | null;

  constructor(message: string, status: number, code: string | null = null, details: any = null, url: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;

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
    } catch {
      // Body is not JSON or empty
      message = resp.statusText || message;
    }

    return new ApiError(message, resp.status, code, details, resp.url);
  }
}
