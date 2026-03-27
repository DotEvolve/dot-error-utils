import { Logger } from "pino";
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
export declare function createLogger(serviceName: string): Logger;
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
export declare function getLogger(): Logger;
