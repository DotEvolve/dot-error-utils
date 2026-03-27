import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { AppError } from "../errors/AppError";
import { ErrorCategory } from "../errors/ErrorCategory";
import { sanitizeData } from "../utils/sanitizer";
import { getLogger } from "../logger";

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    category: string;
    message: string;
    correlationId: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
}

/**
 * Categorize error based on status code or error properties
 */
function categorizeError(error: any): string {
  // Explicit category from custom error
  if (error.category) {
    return error.category;
  }

  // Status code mapping
  const statusMap: Record<number, string> = {
    400: ErrorCategory.VALIDATION,
    401: ErrorCategory.AUTHENTICATION,
    403: ErrorCategory.AUTHORIZATION,
    404: ErrorCategory.NOT_FOUND,
    409: ErrorCategory.CONFLICT,
  };

  if (error.statusCode && statusMap[error.statusCode]) {
    return statusMap[error.statusCode];
  }

  // Network errors
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    return ErrorCategory.SYSTEM;
  }

  // Default to system error
  return ErrorCategory.SYSTEM;
}

/**
 * Centralized error handler middleware with Sentry integration.
 *
 * Categorizes the error, sets Sentry context/tags, captures 5xx and
 * non-operational errors to Sentry, and returns a standardized
 * {@link ErrorResponse} JSON body.
 *
 * Must be registered after all routes and after the Sentry error handler
 * (i.e. after `setupSentryErrorHandler`).
 *
 * @param err - The error object; may be an {@link AppError} or any thrown value
 * @param req - Express request object; `req.correlationId` is used for tracing
 * @param res - Express response object; JSON error body is written here
 * @param next - Express next function (required by Express 4-arg error handler signature)
 * @returns void
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { errorHandlerMiddleware } from '@dotevolve/error-utils/node';
 *
 * const app = express();
 * // ... routes ...
 * app.use(errorHandlerMiddleware);
 * ```
 */
export function errorHandlerMiddleware(
  /**
   * Error Handler Middleware
   *
   * @param {any} err - Error object
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Set defaults
  const statusCode = err.statusCode || 500;
  const category = categorizeError(err);
  const correlationId = req.correlationId || "unknown";

  // Set Sentry context
  Sentry.setContext("error_details", {
    category,
    statusCode,
    path: req.path,
    method: req.method,
    correlationId,
  });

  // Set Sentry tags for grouping
  Sentry.setTag("error_category", category);
  Sentry.setTag("status_code", statusCode);
  Sentry.setTag("correlation_id", correlationId);

  // Set user context if available
  if (req.user) {
    Sentry.setUser({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });
  }

  // Set tenant context if available
  if (req.tenantId) {
    Sentry.setTag("tenant_id", req.tenantId);
  }

  // Add breadcrumb for error
  Sentry.addBreadcrumb({
    category: "error",
    message: err.message,
    level: statusCode >= 500 ? "error" : "warning",
    data: {
      category,
      statusCode,
      correlationId,
    },
  });

  // Capture to Sentry (only for 500 errors or non-operational errors)
  if (statusCode >= 500 || !err.isOperational) {
    Sentry.captureException(err, {
      contexts: {
        request_details: {
          correlationId,
          path: req.path,
          method: req.method,
          query: req.query,
          body: sanitizeData(req.body),
        },
      },
    });
  }

  // Build response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: category,
      category: category,
      message: err.message || "An error occurred",
      correlationId,
    },
    timestamp: new Date().toISOString(),
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.error.stack = err.stack;
  }

  // Add validation details if present
  if (err.details && category === ErrorCategory.VALIDATION) {
    response.error.details = err.details;
  }

  // Log system errors
  if (category === ErrorCategory.SYSTEM) {
    getLogger().error(
      { correlationId, err: err.message },
      "system error encountered",
    );
  }

  res.status(statusCode).json(response);
}

/**
 * Register the Sentry error handler and the custom error handler on an Express app.
 *
 * Call this once after all routes have been defined. It registers
 * `Sentry.setupExpressErrorHandler` followed by {@link errorHandlerMiddleware}.
 *
 * @param app - Express application instance
 * @returns void
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { setupSentryErrorHandler } from '@dotevolve/error-utils/node';
 *
 * const app = express();
 * // ... routes ...
 * setupSentryErrorHandler(app);
 * app.listen(3000);
 * ```
 */
export function setupSentryErrorHandler(app: any): void {
  /**
   * Sets setup sentry error handler
   *
   * @param {any} app - The app
   */
  /**
   * Sets setup sentry error handler
   *
   * @param {any} app - The app
   */
  /**
   * Sets setup sentry error handler
   *
   * @param {any} app - The app
   */
  Sentry.setupExpressErrorHandler(app);

  // Custom error handler after Sentry
  app.use(errorHandlerMiddleware);
}
