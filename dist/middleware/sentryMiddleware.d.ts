import { Request, Response, NextFunction } from "express";
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
export declare function setupSentryMiddleware(app: any): void;
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
export declare function attachSentryContext(
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
): void;
