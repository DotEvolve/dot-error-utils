import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { sanitizeData, sanitizeUrl } from '../utils/sanitizer';

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
export function initializeSentry(config: SentryConfig): typeof Sentry {
  const {
    dsn,
    environment = process.env.NODE_ENV || 'development',
    serviceName,
    release,
    tracesSampleRate = environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate = environment === 'production' ? 0.1 : 1.0,
    sensitiveFields = []
  } = config;

  Sentry.init({
    dsn,
    environment,
    serverName: serviceName,
    release,

    // Performance monitoring
    tracesSampleRate,
    profilesSampleRate,

    // Integrations
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: true }),
    ],

    // Data sanitization
    beforeSend(event, hint) {
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
    beforeBreadcrumb(breadcrumb, hint) {
      if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
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
      'ECONNRESET',
      'EPIPE',
      'ECONNREFUSED',
    ],
  });

  return Sentry;
}
