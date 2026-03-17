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
exports.initializeReactSentry = initializeReactSentry;
const Sentry = __importStar(require("@sentry/react"));
const sanitizer_1 = require("../utils/sanitizer");
/**
 * Initialize Sentry for React frontends with shared configuration
 *
 * @param config - Sentry configuration options
 * @returns Configured React Sentry instance
 */
function initializeReactSentry(config) {
    const { dsn, environment = "development", release, tracesSampleRate = environment === "production" ? 1.0 : 1.0, replaysSessionSampleRate = environment === "production" ? 0.1 : 0, replaysOnErrorSampleRate = environment === "production" ? 1.0 : 1.0, sensitiveFields = [], debug = false, } = config;
    Sentry.init({
        dsn,
        environment,
        release,
        debug,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false,
            }),
        ],
        tracesSampleRate,
        replaysSessionSampleRate,
        replaysOnErrorSampleRate,
        // Data sanitization
        beforeSend(event, hint) {
            if (event.request?.data) {
                event.request.data = (0, sanitizer_1.sanitizeData)(event.request.data, sensitiveFields);
            }
            if (event.extra) {
                event.extra = (0, sanitizer_1.sanitizeData)(event.extra, sensitiveFields);
            }
            return event;
        },
        beforeBreadcrumb(breadcrumb, hint) {
            if (breadcrumb.category === "http" && breadcrumb.data?.url) {
                breadcrumb.data.url = (0, sanitizer_1.sanitizeUrl)(breadcrumb.data.url);
            }
            if (breadcrumb.data) {
                breadcrumb.data = (0, sanitizer_1.sanitizeData)(breadcrumb.data, sensitiveFields);
            }
            return breadcrumb;
        },
    });
    return Sentry;
}
