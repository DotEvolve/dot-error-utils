import * as Sentry from "@sentry/react";
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
export declare function initializeReactSentry(config: ReactSentryConfig): typeof Sentry;
