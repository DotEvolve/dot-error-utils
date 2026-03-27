"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError =
  exports.NotFoundError =
  exports.AuthorizationError =
  exports.AuthenticationError =
  exports.ValidationError =
  exports.AppError =
    void 0;
const ErrorCategory_1 = require("./ErrorCategory");
/**
 * Base application error class with Sentry integration support.
 *
 * All domain-specific errors extend this class. Setting `isOperational = true`
 * signals that the error is expected and should not trigger a process restart.
 *
 * @example
 * ```ts
 * import { AppError } from '@dotevolve/error-utils/node';
 *
 * throw new AppError('Something went wrong', 500, 'system');
 * ```
 */
class AppError extends Error {
  /**
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code to return to the client
   * @param category - Error category from {@link ErrorCategory}
   * @param details - Optional structured details (e.g. field-level validation errors)
   * @param correlationId - Optional request correlation ID for tracing
   */
  constructor(
    message,
    statusCode,
    category,
    details = undefined,
    correlationId,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.category = category;
    this.details = details;
    this.isOperational = true;
    this.correlationId = correlationId;
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
  /**
   * Serialize error details for Sentry context.
   *
   * @returns A plain object suitable for `Sentry.setContext()`
   */
  toSentryContext() {
    return {
      category: this.category,
      statusCode: this.statusCode,
      details: this.details,
      isOperational: this.isOperational,
      correlationId: this.correlationId,
    };
  }
}
exports.AppError = AppError;
/**
 * Validation error (HTTP 400).
 *
 * Use when request input fails validation. Optionally include field-level
 * error details so the client can display per-field messages.
 *
 * @example
 * ```ts
 * throw new ValidationError('Invalid input', { email: ['Email is required'] });
 * ```
 */
class ValidationError extends AppError {
  /**
   * @param message - Summary of the validation failure
   * @param details - Map of field names to arrays of error strings
   * @param correlationId - Optional request correlation ID
   */
  constructor(message, details, correlationId) {
    super(
      message,
      400,
      ErrorCategory_1.ErrorCategory.VALIDATION,
      details,
      correlationId,
    );
  }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error (HTTP 401).
 *
 * Use when the request lacks valid credentials or the session has expired.
 *
 * @example
 * ```ts
 * throw new AuthenticationError('Token expired');
 * ```
 */
class AuthenticationError extends AppError {
  /**
   * @param message - Error description (default: `"Authentication required"`)
   * @param correlationId - Optional request correlation ID
   */
  constructor(message = "Authentication required", correlationId) {
    super(
      message,
      401,
      ErrorCategory_1.ErrorCategory.AUTHENTICATION,
      undefined,
      correlationId,
    );
  }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error (HTTP 403).
 *
 * Use when the authenticated user lacks permission to perform the action.
 *
 * @example
 * ```ts
 * throw new AuthorizationError('Only admins can delete tenants');
 * ```
 */
class AuthorizationError extends AppError {
  /**
   * @param message - Error description (default: `"Insufficient permissions"`)
   * @param correlationId - Optional request correlation ID
   */
  constructor(message = "Insufficient permissions", correlationId) {
    super(
      message,
      403,
      ErrorCategory_1.ErrorCategory.AUTHORIZATION,
      undefined,
      correlationId,
    );
  }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not-found error (HTTP 404).
 *
 * Use when a requested resource does not exist.
 *
 * @example
 * ```ts
 * throw new NotFoundError('Tenant', tenantId);
 * ```
 */
class NotFoundError extends AppError {
  /**
   * @param resource - Name of the resource type (e.g. `"Tenant"`)
   * @param identifier - Optional identifier that was looked up
   * @param correlationId - Optional request correlation ID
   */
  constructor(resource, identifier, correlationId) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(
      message,
      404,
      ErrorCategory_1.ErrorCategory.NOT_FOUND,
      undefined,
      correlationId,
    );
  }
}
exports.NotFoundError = NotFoundError;
/**
 * Conflict error (HTTP 409).
 *
 * Use when the request conflicts with the current state of the resource
 * (e.g. duplicate slug, plan still in use).
 *
 * @example
 * ```ts
 * throw new ConflictError('A tenant with this slug already exists');
 * ```
 */
class ConflictError extends AppError {
  /**
   * @param message - Description of the conflict
   * @param details - Optional structured details about the conflict
   */
  constructor(message, details) {
    super(message, 409, ErrorCategory_1.ErrorCategory.CONFLICT, details);
  }
}
exports.ConflictError = ConflictError;
