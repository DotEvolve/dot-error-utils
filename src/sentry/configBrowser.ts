import * as Sentry from "@sentry/browser";
import { sanitizeData, sanitizeUrl } from "../utils/sanitizer";
import { createLogger } from "../logger/react";

export interface BrowserSentryConfig {
  dsn: string;
  serviceName?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  sensitiveFields?: string[];
}

export function initializeBrowserSentry(config: BrowserSentryConfig): typeof Sentry {
  const {
    dsn,
    serviceName = "browser",
    environment = "production",
    release,
    tracesSampleRate = 1.0,
    sensitiveFields = [],
  } = config;

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    integrations: [Sentry.browserTracingIntegration()],

    beforeSend(event) {
      if (event.request?.data) {
        event.request.data = sanitizeData(event.request.data, sensitiveFields);
      }
      if (event.extra) {
        event.extra = sanitizeData(
          event.extra as Record<string, unknown>,
          sensitiveFields,
        ) as typeof event.extra;
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "http" && breadcrumb.data?.url) {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url as string);
      }
      if (breadcrumb.data) {
        breadcrumb.data = sanitizeData(breadcrumb.data, sensitiveFields);
      }
      return breadcrumb;
    },
  });

  // Mirror initializeSentry pattern: initialise the logger singleton immediately
  createLogger(serviceName);

  return Sentry;
}
