import { Request, Response, NextFunction } from "express";
/**
 * Extend Express Request to include correlationId
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
/**
 * Middleware to generate or preserve correlation IDs for request tracing.
 *
 * Reads the `X-Correlation-Id` request header. If present, the value is
 * preserved as-is; otherwise a new UUID v4 is generated. The ID is attached
 * to `req.correlationId` for downstream middleware and handlers, and echoed
 * back in the `X-Correlation-Id` and `X-Sentry-Trace-Id` response headers.
 *
 * Must be registered after the Sentry request handler.
 *
 * @param req - Express request object; `req.correlationId` is set by this middleware
 * @param res - Express response object; `X-Correlation-Id` header is set
 * @param next - Calls the next middleware in the chain
 * @returns void
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { correlationIdMiddleware } from '@dotevolve/error-utils/node';
 *
 * const app = express();
 * app.use(correlationIdMiddleware);
 * ```
 */
export declare function correlationIdMiddleware(
  /**
   * Correlation Id Middleware
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  req: Request,
  res: Response,
  next: NextFunction,
): void;
