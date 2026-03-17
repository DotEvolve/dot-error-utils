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
 * Centralized error handler middleware with Sentry integration
 *
 * Must be registered after all routes and after Sentry error handler
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
 * Setup Sentry error handler
 * Must be placed after all routes but before custom error handler
 */
export declare function setupSentryErrorHandler(app: any): void;
