"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerMiddleware = errorHandlerMiddleware;
exports.setupSentryErrorHandler = setupSentryErrorHandler;
const Sentry = __importStar(require("@sentry/node"));
const ErrorCategory_1 = require("../errors/ErrorCategory");
const sanitizer_1 = require("../utils/sanitizer");
/**
 * Categorize error based on status code or error properties
 */
function categorizeError(error) {
    // Explicit category from custom error
    if (error.category) {
        return error.category;
    }
    // Status code mapping
    const statusMap = {
        400: ErrorCategory_1.ErrorCategory.VALIDATION,
        401: ErrorCategory_1.ErrorCategory.AUTHENTICATION,
        403: ErrorCategory_1.ErrorCategory.AUTHORIZATION,
        404: ErrorCategory_1.ErrorCategory.NOT_FOUND,
        409: ErrorCategory_1.ErrorCategory.CONFLICT,
    };
    if (error.statusCode && statusMap[error.statusCode]) {
        return statusMap[error.statusCode];
    }
    // Network errors
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        return ErrorCategory_1.ErrorCategory.SYSTEM;
    }
    // Default to system error
    return ErrorCategory_1.ErrorCategory.SYSTEM;
}
/**
 * Centralized error handler middleware with Sentry integration
 *
 * Must be registered after all routes and after Sentry error handler
 */
function errorHandlerMiddleware(
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
err, req, res, next) {
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
                    body: (0, sanitizer_1.sanitizeData)(req.body),
                },
            },
        });
    }
    // Build response
    const response = {
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
    if (err.details && category === ErrorCategory_1.ErrorCategory.VALIDATION) {
        response.error.details = err.details;
    }
    res.status(statusCode).json(response);
}
/**
 * Setup Sentry error handler
 * Must be placed after all routes but before custom error handler
 */
function setupSentryErrorHandler(app) {
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
