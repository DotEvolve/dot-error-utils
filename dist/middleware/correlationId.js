"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdMiddleware = correlationIdMiddleware;
const crypto_1 = require("crypto");
/**
 * Middleware to generate or preserve correlation IDs for request tracing
 *
 * - Generates UUID v4 if X-Correlation-Id header not present
 * - Preserves existing correlation ID from header
 * - Attaches to req.correlationId for downstream use
 * - Sets X-Correlation-Id response header
 *
 * Must be registered after Sentry request handler
 */
function correlationIdMiddleware(req, res, next) {
    // Generate new ID or use existing from header
    req.correlationId =
        req.headers["x-correlation-id"] || (0, crypto_1.randomUUID)();
    // Set response header for client
    res.setHeader("X-Correlation-Id", req.correlationId);
    res.setHeader("X-Sentry-Trace-Id", req.correlationId);
    next();
}
