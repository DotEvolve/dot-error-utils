import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppError } from '../errors/AppError';
import { ErrorCategory } from '../errors/ErrorCategory';
import { sanitizeData } from '../utils/sanitizer';

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
    409: ErrorCategory.CONFLICT
  };

  if (error.statusCode && statusMap[error.statusCode]) {
    return statusMap[error.statusCode];
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return ErrorCategory.SYSTEM;
  }

  // Default to system error
  return ErrorCategory.SYSTEM;
}

/**
 * Centralized error handler middleware with Sentry integration
 * 
 * Must be registered after all routes and after Sentry error handler
 */
export function errorHandlerMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Set defaults
  const statusCode = err.statusCode || 500;
  const category = categorizeError(err);
  const correlationId = req.correlationId || 'unknown';

  // Set Sentry context
  Sentry.setContext('error_details', {
    category,
    statusCode,
    path: req.path,
    method: req.method,
    correlationId,
  });

  // Set Sentry tags for grouping
  Sentry.setTag('error_category', category);
  Sentry.setTag('status_code', statusCode);
  Sentry.setTag('correlation_id', correlationId);

  // Set user context if available
  if (req.user) {
    Sentry.setUser({
      id: (req.user as any).id,
      email: (req.user as any).email,
      role: (req.user as any).role,
    });
  }

  // Set tenant context if available
  if ((req as any).tenantId) {
    Sentry.setTag('tenant_id', (req as any).tenantId);
  }

  // Add breadcrumb for error
  Sentry.addBreadcrumb({
    category: 'error',
    message: err.message,
    level: statusCode >= 500 ? 'error' : 'warning',
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
      message: err.message || 'An error occurred',
      correlationId
    },
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  // Add validation details if present
  if (err.details && category === ErrorCategory.VALIDATION) {
    response.error.details = err.details;
  }

  res.status(statusCode).json(response);
}

/**
 * Setup Sentry error handler
 * Must be placed after all routes but before custom error handler
 */
export function setupSentryErrorHandler(app: any): void {
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error: any) {
      // Capture 5xx errors and non-operational errors
      return error.statusCode >= 500 || !error.isOperational;
    },
  }));

  // Custom error handler after Sentry
  app.use(errorHandlerMiddleware);
}
