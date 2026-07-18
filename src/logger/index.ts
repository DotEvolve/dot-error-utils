import pino from "pino";
import { Writable } from "stream";
import * as Sentry from "@sentry/node";
import type { BrowserLogger } from "../types/logger";

const PINO_TO_SENTRY_LEVEL: Record<number, Sentry.SeverityLevel> = {
  10: "debug",
  20: "debug",
  30: "info",
  40: "warning",
  50: "error",
  60: "fatal",
};

function createSentryStream(): Writable {
  return new Writable({
    write(chunk: Buffer, _encoding, callback) {
      try {
        const record = JSON.parse(chunk.toString());
        const { level, msg, err, ...extra } = record;
        const sentryLevel = PINO_TO_SENTRY_LEVEL[level] ?? "info";

        if (level >= 50) {
          // Pino serializes errors as plain objects { message, stack, type },
          // not actual Error instances. Check for the serialized shape.
          const error =
            err && typeof err === "object" && "message" in err
              ? new Error((err as { message: string }).message)
              : new Error(msg ?? "Unknown error");
          Sentry.captureException(error, { level: sentryLevel, extra });
        } else if (level >= 30) {
          Sentry.addBreadcrumb({
            message: msg,
            level: sentryLevel,
            data: extra,
          });
        }
        // level < 30 (debug/trace): no Sentry call
      } catch {
        // Swallow JSON parse errors — never let a log failure crash the app
      }
      callback();
    },
  });
}

// No-op logger used in test environments and as a fallback before initialisation
const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noopLogger,
} as unknown as BrowserLogger;

let singleton: BrowserLogger | null = null;

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
export function createLogger(serviceName: string): BrowserLogger {
  if (process.env.NODE_ENV === "test") {
    singleton = noopLogger;
    return noopLogger;
  }

  const pinoInstance = pino(
    {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? "info",
      base: { service: serviceName },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream([
      { stream: process.stdout },
      { stream: createSentryStream() },
    ]),
  );

  singleton = pinoInstance as unknown as BrowserLogger;
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
export function getLogger(): BrowserLogger {
  return singleton ?? noopLogger;
}
