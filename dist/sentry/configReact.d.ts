import * as Sentry from "@sentry/react";
export interface ReactSentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  profileSessionSampleRate?: number;
  enableLogs?: boolean;
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
 * @param config.profileSessionSampleRate - Fraction of sessions to profile (0–1)
 * @param config.enableLogs - Set to true to send console logs to Sentry
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
export declare function initializeReactSentry(
  /**
   * Initialize React Sentry
   *
   * @param {ReactSentryConfig} config - Configuration options
   * @returns {any} The any
   */
  config: ReactSentryConfig,
): typeof Sentry;
