import { Writable } from "stream";
import * as Sentry from "@sentry/node";
import type { BrowserLogger } from "../types/logger";
export declare const PINO_TO_SENTRY_LEVEL: Record<number, Sentry.SeverityLevel>;
export declare function createSentryStream(): Writable;
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
export declare function createLogger(serviceName: string): BrowserLogger;
/**
 * Return the current logger singleton.
 *
 * Falls back to a no-op logger if `createLogger` has not been called yet,
 * so callers never need to null-check.
 *
 * @returns The active logger (or a no-op fallback)
 */
export declare function getLogger(): BrowserLogger;
