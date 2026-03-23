import pino, { Logger } from "pino";

// No-op logger used in test environments and as a fallback before initialisation
const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noopLogger,
} as unknown as Logger;

let singleton: Logger | null = null;

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
export function createLogger(serviceName: string): Logger {
  if (process.env.NODE_ENV === "test") {
    singleton = noopLogger;
    return noopLogger;
  }

  singleton = pino({
    name: serviceName,
    level: process.env.LOG_LEVEL ?? "info",
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
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
export function getLogger(): Logger {
  return singleton ?? noopLogger;
}
