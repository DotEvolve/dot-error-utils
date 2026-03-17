import { ErrorCategoryType } from "./ErrorCategory";
/**
 * Base application error class with Sentry integration support
 */
export declare class AppError extends Error {
  readonly statusCode: number;
  readonly category: ErrorCategoryType;
  readonly details: any;
  readonly isOperational: boolean;
  readonly correlationId?: string;
  constructor(
    message: string,
    statusCode: number,
    category: ErrorCategoryType,
    details?: any,
    correlationId?: string,
  );
  /**
   * Serialize error details for Sentry context
   */
  toSentryContext(): Record<string, any>;
}
/**
 * Validation error (400)
 */
export declare class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, string[]>,
    correlationId?: string,
  );
}
/**
 * Authentication error (401)
 */
export declare class AuthenticationError extends AppError {
  constructor(message?: string, correlationId?: string);
}
/**
 * Authorization error (403)
 */
export declare class AuthorizationError extends AppError {
  constructor(message?: string, correlationId?: string);
}
/**
 * Not found error (404)
 */
export declare class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, correlationId?: string);
}
/**
 * Conflict error (409)
 */
export declare class ConflictError extends AppError {
  constructor(message: string, details?: any);
}
