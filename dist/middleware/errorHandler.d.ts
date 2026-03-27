import { Request, Response, NextFunction } from "express";
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
export declare function errorHandlerMiddleware(
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
): void;
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
export declare function setupSentryErrorHandler(app: any): void;
