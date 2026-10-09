"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.getLogger = getLogger;
const pino_1 = __importDefault(require("pino"));
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
    });
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
