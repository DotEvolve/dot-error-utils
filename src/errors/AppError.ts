import { ErrorCategory, ErrorCategoryType } from "./ErrorCategory";

/**
 * Base application error class with Sentry integration support
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly category: ErrorCategoryType;
  public readonly details: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    category: ErrorCategoryType,
    details: any = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.category = category;
    this.details = details;
    this.isOperational = true;

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
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 400, ErrorCategory.VALIDATION, details);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, ErrorCategory.AUTHENTICATION);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, ErrorCategory.AUTHORIZATION);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, 404, ErrorCategory.NOT_FOUND);
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
