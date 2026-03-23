import * as Sentry from "@sentry/node";
import { sanitizeData, sanitizeUrl } from "../utils/sanitizer";
import { createLogger } from "../logger";

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      tenantId?: string;
      user?: {
        id?: string;
        email?: string;
        username?: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

export interface SentryConfig {
  dsn: string;
  environment?: string;
  serviceName: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  sensitiveFields?: string[];
}

/**
 * Initialize Sentry for a Node.js / Express service.
 *
 * Configures the Sentry SDK with the provided options, applies sensible
 * defaults for `tracesSampleRate` and `profilesSampleRate` based on the
 * environment, sanitizes outgoing event data, and initialises the structured
 * logger singleton for the service.
 *
 * Call this once at application startup, before any routes are registered.
 *
 * @param config - Sentry configuration options
 * @param config.dsn - Sentry DSN for the project
 * @param config.serviceName - Identifies the service in Sentry and log output
 * @param config.environment - Deployment environment (defaults to `NODE_ENV`)
 * @param config.release - Release identifier (e.g. git SHA)
 * @param config.tracesSampleRate - Fraction of transactions to sample (0–1)
 * @param config.profilesSampleRate - Fraction of profiles to sample (0–1)
 * @param config.sensitiveFields - Additional field names to redact from events
 * @returns The configured `@sentry/node` module
 *
 * @throws Does not throw; Sentry SDK errors are swallowed internally
 *
 * @example
 * ```ts
 * import { initializeSentry } from '@dotevolve/error-utils/node';
 *
 * initializeSentry({
 *   dsn: process.env.SENTRY_DSN!,
 *   serviceName: 'my-api',
 *   environment: process.env.NODE_ENV,
 * });
 * ```
 */
export function initializeSentry(config: SentryConfig): typeof Sentry {
  /**
   * Initialize Sentry
   *
   * @param {SentryConfig} config - Configuration options
   * @returns {any} The any
   */
  /**
   * Initialize Sentry
   *
   * @param {SentryConfig} config - Configuration options
   * @returns {any} The any
   */
  const {
    dsn,
    environment = process.env.NODE_ENV || "development",
    serviceName,
    release,
    tracesSampleRate = environment === "production" ? 0.1 : 1.0,
    profilesSampleRate = environment === "production" ? 0.1 : 1.0,
    sensitiveFields = [],
  } = config;

  let profilingIntegration: any = null;
  try {
    profilingIntegration =
      require("@sentry/profiling-node").nodeProfilingIntegration;
  } catch {
    // Profiling not available (native bindings missing) — disabled gracefully
  }

  Sentry.init({
    dsn,
    environment,
    serverName: serviceName,
    release,
    debug: true, // Enable Sentry logs for debugging
    enableLogs: true,

    // Performance monitoring
    tracesSampleRate,
    profilesSampleRate,

    // Integrations
    integrations: [...(profilingIntegration ? [profilingIntegration()] : [])],

    // Data sanitization
    beforeSend(event: any, hint: any) {
      // Sanitize request data
      if (event.request?.data) {
        event.request.data = sanitizeData(event.request.data, sensitiveFields);
      }

      // Sanitize extra context
      if (event.extra) {
        event.extra = sanitizeData(event.extra, sensitiveFields);
      }

      return event;
    },

    // Breadcrumb filtering and sanitization
    beforeBreadcrumb(breadcrumb: any, hint: any) {
      if (breadcrumb.category === "http" && breadcrumb.data?.url) {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
      }

      // Sanitize breadcrumb data
      if (breadcrumb.data) {
        breadcrumb.data = sanitizeData(breadcrumb.data, sensitiveFields);
      }

      return breadcrumb;
    },

    // Error filtering
    ignoreErrors: [
      // Ignore known non-critical errors
      "ECONNRESET",
      "EPIPE",
      "ECONNREFUSED",
    ],
  });

  // Initialise the logger singleton for this service
  createLogger(serviceName);

  return Sentry;
}
