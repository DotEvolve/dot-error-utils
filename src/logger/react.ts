import * as Sentry from "@sentry/react";
import type { BrowserLogger, LogMeta } from "../types/logger";

function createBrowserLogger(
  serviceName: string,
  bindings: LogMeta = {},
): BrowserLogger {
  const buildExtra = (obj?: LogMeta | Error | string): LogMeta => ({
    service: serviceName,
    ...bindings,
    ...(obj && typeof obj === "object" && !(obj instanceof Error)
      ? (obj as LogMeta)
      : {}),
  });

  return {
    debug(obj: LogMeta | string, msg?: string) {
      const message = typeof obj === "string" ? obj : (msg ?? "");
      console.debug(
        `[${serviceName}]`,
        message,
        typeof obj === "object" ? obj : "",
      );
    },
    info(obj: LogMeta | string, msg?: string) {
      const message = typeof obj === "string" ? obj : (msg ?? "");
      console.info(`[${serviceName}]`, message);
      Sentry.addBreadcrumb({
        message,
        level: "info",
        data: buildExtra(obj as LogMeta),
      });
    },
    warn(obj: LogMeta | string, msg?: string) {
      const message = typeof obj === "string" ? obj : (msg ?? "");
      console.warn(`[${serviceName}]`, message);
      Sentry.addBreadcrumb({
        message,
        level: "warning",
        data: buildExtra(obj as LogMeta),
      });
    },
    error(obj: LogMeta | Error | string, msg?: string) {
      const message = typeof obj === "string" ? obj : (msg ?? "");
      const error = obj instanceof Error ? obj : new Error(message);
      console.error(`[${serviceName}]`, message, obj);
      Sentry.captureException(error, { extra: buildExtra(obj) });
    },
    fatal(obj: LogMeta | Error | string, msg?: string) {
      const message = typeof obj === "string" ? obj : (msg ?? "");
      const error = obj instanceof Error ? obj : new Error(message);
      console.error(`[${serviceName}][FATAL]`, message, obj);
      Sentry.captureException(error, {
        level: "fatal",
        extra: buildExtra(obj),
      });
    },
    child(childBindings: LogMeta): BrowserLogger {
      return createBrowserLogger(serviceName, {
        ...bindings,
        ...childBindings,
      });
    },
  };
}

const noopLogger: BrowserLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noopLogger,
};

let singleton: BrowserLogger | null = null;

export function createLogger(serviceName: string): BrowserLogger {
  singleton = createBrowserLogger(serviceName);
  return singleton;
}

export function getLogger(): BrowserLogger {
  return singleton ?? noopLogger;
}
