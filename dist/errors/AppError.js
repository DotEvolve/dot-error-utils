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
 * Base application error class with Sentry integration support
 */
class AppError extends Error {
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
   * Serialize error details for Sentry context
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
 * Validation error (400)
 */
class ValidationError extends AppError {
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
 * Authentication error (401)
 */
class AuthenticationError extends AppError {
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
 * Authorization error (403)
 */
class AuthorizationError extends AppError {
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
 * Not found error (404)
 */
class NotFoundError extends AppError {
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
 * Conflict error (409)
 */
class ConflictError extends AppError {
  constructor(message, details) {
    super(message, 409, ErrorCategory_1.ErrorCategory.CONFLICT, details);
  }
}
exports.ConflictError = ConflictError;
