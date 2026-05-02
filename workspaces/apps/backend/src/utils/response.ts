import { Response } from "express";

/**
 * Standardised response envelope for all API responses.
 *
 * Success: { success: true, data }
 * Error:   { success: false, error: { code, message, details? } }
 */

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Wrap any payload in a standard success envelope.
 */
export const success = (data: any) => ({
  success: true,
  data,
});

/**
 * Wrap an error in a standard error envelope.
 * Typically called from the global error handler, not from services.
 */
export const error = (code: string, message: string, details?: any) => ({
  success: false,
  error: {
    code,
    message,
    ...(details !== undefined && { details }),
  },
});

/**
 * Send a standardized success response.
 */
export const sendSuccess = (res: Response, data: any, statusCode = 200) => {
  return res.status(statusCode).json(success(data));
};
