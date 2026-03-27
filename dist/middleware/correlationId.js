"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdMiddleware = correlationIdMiddleware;
const crypto_1 = require("crypto");
const logger_1 = require("../logger");
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
function correlationIdMiddleware(
  /**
   * Correlation Id Middleware
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  req,
  res,
  next,
) {
  // Generate new ID or use existing from header
  req.correlationId =
    req.headers?.["x-correlation-id"] || (0, crypto_1.randomUUID)();
  // Set response header for client
  res.setHeader("X-Correlation-Id", req.correlationId);
  res.setHeader("X-Sentry-Trace-Id", req.correlationId);
  (0, logger_1.getLogger)().debug(
    { correlationId: req.correlationId },
    "correlation ID assigned",
  );
  next();
}
