import * as Sentry from "@sentry/browser";
export interface BrowserSentryConfig {
    dsn: string;
    serviceName?: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
    sensitiveFields?: string[];
}
export declare function initializeBrowserSentry(config: BrowserSentryConfig): typeof Sentry;
