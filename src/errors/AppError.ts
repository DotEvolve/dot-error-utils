import { ErrorCategory, ErrorCategoryType } from "./ErrorCategory";

/**
 * Base application error class with Sentry integration support
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly category: ErrorCategoryType;
  public readonly details: any;
  public readonly isOperational: boolean;
  public readonly correlationId?: string;

  constructor(
    message: string,
    statusCode: number,
    category: ErrorCategoryType,
    details: any = null,
    correlationId?: string,
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
   * Serialize error details for Sentry context
   */
  toSentryContext(): Record<string, any> {
    return {
      category: this.category,
      statusCode: this.statusCode,
      details: this.details,
      isOperational: this.isOperational,
      correlationId: this.correlationId,
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>, correlationId?: string) {
    super(message, 400, ErrorCategory.VALIDATION, details, correlationId);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required", correlationId?: string) {
    super(message, 401, ErrorCategory.AUTHENTICATION, undefined, correlationId);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions", correlationId?: string) {
    super(message, 403, ErrorCategory.AUTHORIZATION, undefined, correlationId);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, correlationId?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, 404, ErrorCategory.NOT_FOUND, undefined, correlationId);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, ErrorCategory.CONFLICT, details);
  }
}
