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
exports.setupSentryMiddleware = setupSentryMiddleware;
exports.attachSentryContext = attachSentryContext;
const Sentry = __importStar(require("@sentry/node"));
const crypto_1 = require("crypto");
/**
 * Setup Sentry request and tracing middleware
 * Must be first middleware in the chain
 */
function setupSentryMiddleware(app) {
    // Sentry request handler must be first
    app.use(Sentry.Handlers.requestHandler({
        // Include user data in events
        user: ['id', 'email', 'role'],
        // Include request data
        request: ['method', 'url', 'headers', 'data'],
        // Include transaction name
        transaction: 'methodPath',
    }));
    // Sentry tracing middleware
    app.use(Sentry.Handlers.tracingHandler());
    // Custom middleware to expose trace ID as correlationId
    app.use((req, res, next) => {
        // Get Sentry trace ID (replaces custom correlation ID)
        const transaction = Sentry.getCurrentHub().getScope().getTransaction();
        const traceId = transaction?.traceId ||
            Sentry.getCurrentHub().getScope().getSpan()?.traceId;
        // Expose as correlationId for backward compatibility
        req.correlationId = traceId || generateFallbackId();
        // Set response headers
        res.setHeader('X-Correlation-Id', req.correlationId);
        res.setHeader('X-Sentry-Trace-Id', req.correlationId);
        // Add breadcrumb for request
        Sentry.addBreadcrumb({
            category: 'request',
            message: `${req.method} ${req.path}`,
            level: 'info',
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
function generateFallbackId() {
    return `fallback-${Date.now()}-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
}
/**
 * Attach Sentry context for user and request details
 */
function attachSentryContext(req, res, next) {
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
    Sentry.setContext('request_details', {
        correlationId: req.correlationId,
        tenantId: req.tenantId,
        path: req.path,
        method: req.method,
        query: req.query,
        ip: req.ip,
    });
    // Set tags for filtering
    if (req.tenantId) {
        Sentry.setTag('tenant_id', req.tenantId);
    }
    if (req.user && req.user.role) {
        Sentry.setTag('user_role', req.user.role);
    }
    next();
}
