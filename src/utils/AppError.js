import { StatusCodes } from "http-status-codes";

/**
 * Custom application error class with HTTP status codes and error codes.
 * All services throw AppError instead of returning ad-hoc responses.
 */
export class AppError extends Error {
  constructor(
    message,
    statusCode,
    code,
    details,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // --- Factory methods for common errors ---

  static badRequest(message, code = 'BAD_REQUEST', details) {
    return new AppError(message, StatusCodes.BAD_REQUEST, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(message, StatusCodes.UNAUTHORIZED, code);
  }

  static notAcceptable(message = 'Not Acceptable', code = 'NOT_ACCEPTABLE') {
    return new AppError(message, StatusCodes.NOT_ACCEPTABLE, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(message, StatusCodes.FORBIDDEN, code);
  }

  static notFound(resource = 'Resource', code = 'NOT_FOUND') {
    return new AppError(`${resource} not found`, StatusCodes.NOT_FOUND, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, StatusCodes.CONFLICT, code);
  }

  static limitReached(resource, code) {
    return new AppError(`${resource} limit reached for your current plan`, StatusCodes.FORBIDDEN, code);
  }

  static tooMany(message = 'Too many requests', code = 'TOO_MANY_REQUESTS') {
    return new AppError(message, StatusCodes.TOO_MANY_REQUESTS, code);
  }
}
