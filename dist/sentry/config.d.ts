import * as Sentry from '@sentry/node';
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
 * Initialize Sentry with service-specific configuration
 *
 * @param config - Sentry configuration options
 * @returns Configured Sentry instance
 */
export declare function initializeSentry(config: SentryConfig): typeof Sentry;
