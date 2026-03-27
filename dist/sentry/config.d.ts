import * as Sentry from "@sentry/node";
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
export declare function initializeSentry(config: SentryConfig): typeof Sentry;
