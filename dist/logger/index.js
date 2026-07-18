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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PINO_TO_SENTRY_LEVEL = void 0;
exports.createSentryStream = createSentryStream;
exports.createLogger = createLogger;
exports.getLogger = getLogger;
const pino_1 = __importDefault(require("pino"));
const stream_1 = require("stream");
const Sentry = __importStar(require("@sentry/node"));
exports.PINO_TO_SENTRY_LEVEL = {
    10: "debug",
    20: "debug",
    30: "info",
    40: "warning",
    50: "error",
    60: "fatal",
};
function createSentryStream() {
    return new stream_1.Writable({
        write(chunk, _encoding, callback) {
            try {
                const record = JSON.parse(chunk.toString());
                const { level, msg, err, ...extra } = record;
                const sentryLevel = exports.PINO_TO_SENTRY_LEVEL[level] ?? "info";
                if (level >= 50) {
                    // Pino serializes errors as plain objects { message, stack, type },
                    // not actual Error instances. Check for the serialized shape.
                    const error = err && typeof err === "object" && "message" in err
                        ? new Error(err.message)
                        : new Error(msg ?? "Unknown error");
                    Sentry.captureException(error, { level: sentryLevel, extra });
                }
                else if (level >= 30) {
                    Sentry.addBreadcrumb({
                        message: msg,
                        level: sentryLevel,
                        data: extra,
                    });
                }
                // level < 30 (debug/trace): no Sentry call
            }
            catch {
                // Swallow JSON parse errors — never let a log failure crash the app
            }
            callback();
        },
    });
}
// No-op logger used in test environments and as a fallback before initialisation
const noopLogger = {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
    fatal: () => { },
    child: () => noopLogger,
};
let singleton = null;
/**
 * Create (or replace) the module-level logger singleton.
 *
 * Returns a no-op logger when `NODE_ENV === 'test'` so tests stay silent by
 * default. Call this once during application bootstrap (e.g. inside
 * `initializeSentry`).
 *
 * @param serviceName - Identifies the service in every log line (`service` field)
 * @returns The created logger instance
 */
function createLogger(serviceName) {
    if (process.env.NODE_ENV === "test") {
        singleton = noopLogger;
        return noopLogger;
    }
    const pinoInstance = (0, pino_1.default)({
        name: serviceName,
        level: process.env.LOG_LEVEL ?? "info",
        base: { service: serviceName },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
    }, pino_1.default.multistream([
        { stream: process.stdout },
        { stream: createSentryStream() },
    ]));
    singleton = pinoInstance;
    return singleton;
}
/**
 * Return the current logger singleton.
 *
 * Falls back to a no-op logger if `createLogger` has not been called yet,
 * so callers never need to null-check.
 *
 * @returns The active logger (or a no-op fallback)
 */
function getLogger() {
    return singleton ?? noopLogger;
}
