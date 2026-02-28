import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Setup Sentry request and tracing middleware
 * Must be first middleware in the chain
 */
export function setupSentryMiddleware(app: any): void {
  // Sentry request handler must be first
  app.use(Sentry.Handlers.requestHandler({
    // Include user data in events
    user: ['id', 'email', 'role'],
    // Include request data
    request: ['method', 'url', 'headers', 'data'],
    // Include transaction name
    transaction: 'methodPath',
  }));

  // Sentry tracing middleware
  app.use(Sentry.Handlers.tracingHandler());

  // Custom middleware to expose trace ID as correlationId
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Get Sentry trace ID (replaces custom correlation ID)
    const transaction = Sentry.getCurrentHub().getScope().getTransaction();
    const traceId = transaction?.traceId || 
                    Sentry.getCurrentHub().getScope().getSpan()?.traceId;

    // Expose as correlationId for backward compatibility
    req.correlationId = traceId || generateFallbackId();

    // Set response headers
    res.setHeader('X-Correlation-Id', req.correlationId);
    res.setHeader('X-Sentry-Trace-Id', req.correlationId);

    // Add breadcrumb for request
    Sentry.addBreadcrumb({
      category: 'request',
      message: `${req.method} ${req.path}`,
      level: 'info',
      data: {
        method: req.method,
        url: req.url,
        correlationId: req.correlationId,
      },
    });

    next();
  });
}

/**
 * Generate fallback ID if Sentry trace ID is not available
 */
function generateFallbackId(): string {
  return `fallback-${Date.now()}-${randomUUID().substring(0, 8)}`;
}

/**
 * Attach Sentry context for user and request details
 */
export function attachSentryContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Set user context
  if (req.user) {
    Sentry.setUser({
      id: (req.user as any).id,
      email: (req.user as any).email,
      username: (req.user as any).username,
      role: (req.user as any).role,
    });
  }

  // Set custom context
  Sentry.setContext('request_details', {
    correlationId: req.correlationId,
    tenantId: (req as any).tenantId,
    path: req.path,
    method: req.method,
    query: req.query,
    ip: req.ip,
  });

  // Set tags for filtering
  if ((req as any).tenantId) {
    Sentry.setTag('tenant_id', (req as any).tenantId);
  }

  if (req.user && (req.user as any).role) {
    Sentry.setTag('user_role', (req.user as any).role);
  }

  next();
}
