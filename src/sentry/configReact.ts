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
 * Initialize Sentry for React frontends with shared configuration
 *
 * @param config - Sentry configuration options
 * @returns Configured React Sentry instance
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
