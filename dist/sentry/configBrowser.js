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
exports.initializeBrowserSentry = initializeBrowserSentry;
const Sentry = __importStar(require("@sentry/browser"));
const sanitizer_1 = require("../utils/sanitizer");
const react_1 = require("../logger/react");
function initializeBrowserSentry(config) {
    const { dsn, serviceName = "browser", environment = "production", release, tracesSampleRate = 1.0, sensitiveFields = [], } = config;
    Sentry.init({
        dsn,
        environment,
        release,
        tracesSampleRate,
        integrations: [Sentry.browserTracingIntegration()],
        beforeSend(event) {
            if (event.request?.data) {
                event.request.data = (0, sanitizer_1.sanitizeData)(event.request.data, sensitiveFields);
            }
            if (event.extra) {
                event.extra = (0, sanitizer_1.sanitizeData)(event.extra, sensitiveFields);
            }
            return event;
        },
        beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.category === "http" && breadcrumb.data?.url) {
                breadcrumb.data.url = (0, sanitizer_1.sanitizeUrl)(breadcrumb.data.url);
            }
            if (breadcrumb.data) {
                breadcrumb.data = (0, sanitizer_1.sanitizeData)(breadcrumb.data, sensitiveFields);
            }
            return breadcrumb;
        },
    });
    // Mirror initializeSentry pattern: initialise the logger singleton immediately
    (0, react_1.createLogger)(serviceName);
    return Sentry;
}
