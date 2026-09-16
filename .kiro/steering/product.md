---
inclusion: always
---

# Product: `@dotevolve/error-utils`

Shared library providing standardized error handling, Sentry integration, and structured logging across the entire DotEvolve ecosystem (Node.js services, Express APIs, and React frontends).

## Entry Points

| Import path | Contents |
|---|---|
| `@dotevolve/error-utils` | Core error classes and `ErrorCategory` |
| `@dotevolve/error-utils/node` | Node.js: error classes, middleware, Sentry config, logger, `asyncHandler`, `withTransaction`, sanitizers |
| `@dotevolve/error-utils/express` | Express: same as `/node` minus the logger |
| `@dotevolve/error-utils/react` | React: error classes, `initializeReactSentry`, sanitizers, `@sentry/react` re-export |

Never import across entry points. Use the entry point that matches the runtime.

## Error Class Hierarchy

All errors extend `AppError`. Use the most specific subclass available:

| Class | HTTP | When to use |
|---|---|---|
| `ValidationError` | 400 | Request input fails validation; accepts field-level `details` map |
| `AuthenticationError` | 401 | Missing or expired credentials |
| `AuthorizationError` | 403 | Authenticated but lacks permission |
| `NotFoundError` | 404 | Resource does not exist; accepts `(resource, identifier?)` |
| `ConflictError` | 409 | Duplicate slug, resource still in use, etc. |
| `AppError` | any | Custom status codes not covered above |

`AppError.isOperational = true` signals an expected error — do not restart the process. Non-operational errors (unexpected throws) should trigger alerts.

## Key Utilities

- **`asyncHandler(fn)`** — wraps async Express route handlers; forwards thrown errors to `next()`. Always use this instead of manual try/catch in routes.
- **`withTransaction(prisma, fn, label)`** — wraps Prisma transactions; rolls back on any thrown error.
- **`correlationIdMiddleware`** — attaches a `X-Correlation-Id` header to every request. Register before routes.
- **`sanitizeData` / `sanitizeUrl`** — strip sensitive fields before logging or sending to Sentry.
- **`createLogger` / `getLogger`** (node only) — pino-based structured logger. Use instead of `console.log` in all backend services.

## Express Setup Order (mandatory)

```ts
import { initializeSentry, setupSentryMiddleware, correlationIdMiddleware, setupSentryErrorHandler } from '@dotevolve/error-utils/express';

initializeSentry({ dsn, serviceName, environment, release }); // FIRST — before any other code

app.use(express.json());
setupSentryMiddleware(app);       // 1. Sentry request tracking
app.use(correlationIdMiddleware); // 2. Correlation ID
app.use(authMiddleware);          // 3. Auth
app.use('/api', routes);          // 4. Routes
setupSentryErrorHandler(app);     // 5. LAST — Sentry error handler
```

## React Setup

```ts
// instrument.ts (imported before App renders)
import { initializeReactSentry } from '@dotevolve/error-utils/react';
initializeReactSentry({ dsn, environment, release });
```

Use `Sentry.ErrorBoundary` from the re-exported `@sentry/react` for top-level error boundaries.

## Key Conventions

- **Always use typed error classes** — never `res.status(4xx).json({ error: '...' })` directly. Throw the appropriate subclass and let `errorHandlerMiddleware` format the response.
- **`asyncHandler` is mandatory** for async Express routes — it ensures errors reach the centralized handler.
- **`initializeSentry` must be called first** — before any route or middleware registration. Errors thrown before initialization are not captured.
- **`correlationId` must propagate** — pass the correlation ID when constructing errors so it appears in Sentry events and API responses.
- **Use `withTransaction` for Prisma** — never call `prisma.$transaction` directly in service code.
- **Use `createLogger`/`getLogger` for all backend logging** — never use `console.log` in production code.
- **Sanitize before logging** — run user-supplied data through `sanitizeData` before attaching it to Sentry context or log entries.

## Deployment

Distributed as an internal npm package (`@dotevolve/error-utils`). `express`, `react`, and `react-dom` are peer dependencies — never bundle them. Run `npm run build` (tsc) before publishing.
