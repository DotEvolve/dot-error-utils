import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { getLogger } from "../logger";

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
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate new ID or use existing from header
  req.correlationId =
    (req.headers?.["x-correlation-id"] as string) || randomUUID();

  // Set response header for client
  res.setHeader("X-Correlation-Id", req.correlationId);
  res.setHeader("X-Sentry-Trace-Id", req.correlationId);

  getLogger().debug(
    { correlationId: req.correlationId },
    "correlation ID assigned",
  );

  next();
}
