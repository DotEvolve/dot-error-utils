"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.getLogger = getLogger;
const pino_1 = __importDefault(require("pino"));
// No-op logger used in test environments and as a fallback before initialisation
const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
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
 *
 * @example
 * ```ts
 * import { createLogger } from '@dotevolve/error-utils/node';
 * createLogger('my-api');
 * ```
 */
function createLogger(serviceName) {
  /**
   * Creates a new logger
   *
   * @param {string} serviceName - The service name
   * @returns {Logger} The Logger
   */
  if (process.env.NODE_ENV === "test") {
    singleton = noopLogger;
    return noopLogger;
  }
  singleton = (0, pino_1.default)({
    name: serviceName,
    level: process.env.LOG_LEVEL ?? "info",
    base: { service: serviceName },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
  });
  return singleton;
}
/**
 * Return the current logger singleton.
 *
 * Falls back to a no-op logger if `createLogger` has not been called yet,
 * so callers never need to null-check.
 *
 * @returns The active logger (or a no-op fallback)
 *
 * @example
 * ```ts
 * import { getLogger } from '@dotevolve/error-utils/node';
 * getLogger().info({ correlationId }, 'request received');
 * ```
 */
function getLogger() {
  /**
   * Retrieves logger
   *
   * @returns {Logger} The Logger
   */
  return singleton ?? noopLogger;
}
