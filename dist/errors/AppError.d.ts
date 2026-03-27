import { ErrorCategoryType } from "./ErrorCategory";
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
export declare class AppError extends Error {
  readonly statusCode: number;
  readonly category: ErrorCategoryType;
  readonly details: any;
  readonly isOperational: boolean;
  readonly correlationId?: string;
  /**
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code to return to the client
   * @param category - Error category from {@link ErrorCategory}
   * @param details - Optional structured details (e.g. field-level validation errors)
   * @param correlationId - Optional request correlation ID for tracing
   */
  constructor(
    message: string,
    statusCode: number,
    category: ErrorCategoryType,
    details?: any,
    correlationId?: string,
  );
  /**
   * Serialize error details for Sentry context.
   *
   * @returns A plain object suitable for `Sentry.setContext()`
   */
  toSentryContext(): Record<string, any>;
}
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
export declare class ValidationError extends AppError {
  /**
   * @param message - Summary of the validation failure
   * @param details - Map of field names to arrays of error strings
   * @param correlationId - Optional request correlation ID
   */
  constructor(
    message: string,
    details?: Record<string, string[]>,
    correlationId?: string,
  );
}
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
export declare class AuthenticationError extends AppError {
  /**
   * @param message - Error description (default: `"Authentication required"`)
   * @param correlationId - Optional request correlation ID
   */
  constructor(message?: string, correlationId?: string);
}
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
export declare class AuthorizationError extends AppError {
  /**
   * @param message - Error description (default: `"Insufficient permissions"`)
   * @param correlationId - Optional request correlation ID
   */
  constructor(message?: string, correlationId?: string);
}
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
export declare class NotFoundError extends AppError {
  /**
   * @param resource - Name of the resource type (e.g. `"Tenant"`)
   * @param identifier - Optional identifier that was looked up
   * @param correlationId - Optional request correlation ID
   */
  constructor(resource: string, identifier?: string, correlationId?: string);
}
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
export declare class ConflictError extends AppError {
  /**
   * @param message - Description of the conflict
   * @param details - Optional structured details about the conflict
   */
  constructor(message: string, details?: any);
}
