import * as Sentry from "@sentry/node";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Register Sentry request tracing middleware on an Express app.
 *
 * Attaches a custom middleware that reads the active Sentry trace ID (or
 * generates a fallback UUID) and exposes it as `req.correlationId`. Also sets
 * `X-Correlation-Id` and `X-Sentry-Trace-Id` response headers and adds a
 * Sentry breadcrumb for each request.
 *
 * Must be the first middleware registered on the app.
 *
 * @param app - Express application instance
 * @returns void
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { setupSentryMiddleware } from '@dotevolve/error-utils/node';
 *
 * const app = express();
 * setupSentryMiddleware(app);
 * ```
 */
export function setupSentryMiddleware(app: any): void {
  /**
   * Sets setup sentry middleware
   *
   * @param {any} app - The app
   */
  /**
   * Sets setup sentry middleware
   *
   * @param {any} app - The app
   */
  // In Sentry v8, requestHandler and tracingHandler are auto-instrumented.

  // Custom middleware to expose trace ID as correlationId
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Get Sentry trace ID (replaces custom correlation ID)
    const traceId = Sentry.getActiveSpan()?.spanContext().traceId;

    // Expose as correlationId for backward compatibility
    req.correlationId = traceId || generateFallbackId();

    // Set response headers
    res.setHeader("X-Correlation-Id", req.correlationId);
    res.setHeader("X-Sentry-Trace-Id", req.correlationId);

    // Add breadcrumb for request
    Sentry.addBreadcrumb({
      category: "request",
      message: `${req.method} ${req.path}`,
      level: "info",
      data: {
        method: req.method,
        url: req.url,
        correlationId: req.correlationId,
      },
    });

    next();
  });
}

/**
 * Generate fallback ID if Sentry trace ID is not available
 */
function generateFallbackId(): string {
  return `fallback-${Date.now()}-${randomUUID().substring(0, 8)}`;
}

/**
 * Express middleware that attaches Sentry user and request context.
 *
 * Sets the Sentry user scope from `req.user` (when present), adds a
 * `request_details` context object, and tags the event with `tenant_id` and
 * `user_role` when available.
 *
 * Register this after authentication middleware so `req.user` is populated.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Calls the next middleware in the chain
 * @returns void
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { attachSentryContext } from '@dotevolve/error-utils/node';
 *
 * const app = express();
 * app.use(authMiddleware);
 * app.use(attachSentryContext);
 * ```
 */
export function attachSentryContext(
  /**
   * Attach Sentry Context
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  /**
   * Attach Sentry Context
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Set user context
  if (req.user) {
    Sentry.setUser({
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
    });
  }

  // Set custom context
  Sentry.setContext("request_details", {
    correlationId: req.correlationId,
    tenantId: (req as any).tenantId,
    path: req.path,
    method: req.method,
    query: req.query,
    ip: req.ip,
  });

  // Set tags for filtering
  if (req.tenantId) {
    Sentry.setTag("tenant_id", req.tenantId);
  }

  if (req.user && req.user.role) {
    Sentry.setTag("user_role", req.user.role);
  }

  next();
}
