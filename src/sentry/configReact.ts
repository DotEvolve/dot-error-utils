import * as Sentry from "@sentry/react";
import { sanitizeData, sanitizeUrl } from "../utils/sanitizer";

export interface ReactSentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  sensitiveFields?: string[];
  debug?: boolean;
}

/**
 * Initialize Sentry for a React frontend application.
 *
 * Configures the `@sentry/react` SDK with browser tracing and session replay
 * integrations, applies data sanitization hooks, and returns the configured
 * Sentry module.
 *
 * Call this once at the application entry point before rendering.
 *
 * @param config - React Sentry configuration options
 * @param config.dsn - Sentry DSN for the project
 * @param config.environment - Deployment environment (defaults to `"development"`)
 * @param config.release - Release identifier (e.g. git SHA)
 * @param config.tracesSampleRate - Fraction of transactions to sample (0–1)
 * @param config.replaysSessionSampleRate - Fraction of sessions to replay (0–1)
 * @param config.replaysOnErrorSampleRate - Fraction of error sessions to replay (0–1)
 * @param config.sensitiveFields - Additional field names to redact from events
 * @param config.debug - Enable Sentry debug logging (default: `false`)
 * @returns The configured `@sentry/react` module
 *
 * @throws Does not throw; Sentry SDK errors are swallowed internally
 *
 * @example
 * ```ts
 * import { initializeReactSentry } from '@dotevolve/error-utils/react';
 *
 * initializeReactSentry({
 *   dsn: import.meta.env.VITE_SENTRY_DSN,
 *   environment: import.meta.env.MODE,
 * });
 * ```
 */
export function initializeReactSentry(
  config: ReactSentryConfig,
): typeof Sentry {
  const {
    dsn,
    environment = "development",
    release,
    tracesSampleRate = environment === "production" ? 1.0 : 1.0,
    replaysSessionSampleRate = environment === "production" ? 0.1 : 0,
    replaysOnErrorSampleRate = environment === "production" ? 1.0 : 1.0,
    sensitiveFields = [],
    debug = false,
  } = config;

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
    beforeSend(event: any, hint: any) {
      if (event.request?.data) {
        event.request.data = sanitizeData(event.request.data, sensitiveFields);
      }
      if (event.extra) {
        event.extra = sanitizeData(event.extra, sensitiveFields);
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb: any, hint: any) {
      if (breadcrumb.category === "http" && breadcrumb.data?.url) {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
      }
      if (breadcrumb.data) {
        breadcrumb.data = sanitizeData(breadcrumb.data, sensitiveFields);
      }
      return breadcrumb;
    },
  });

  return Sentry;
}
