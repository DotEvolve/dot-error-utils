---
inclusion: always
---

# Project Structure

```
src/
├── index.ts                    # Root entry point — re-exports core error classes and ErrorCategory
├── node.ts                     # Node.js entry point — re-exports errors, middleware, logger, utils, db helpers
├── express.ts                  # Express entry point — same as node.ts minus the logger
├── react.ts                    # React entry point — re-exports error classes, Sentry React config, sanitizers
├── errors/
│   ├── AppError.ts             # Base error class (isOperational flag, HTTP status)
│   └── ErrorCategory.ts        # ErrorCategory enum and typed error subclasses
├── middleware/
│   ├── correlationId.ts        # correlationIdMiddleware — attaches X-Correlation-Id to every request
│   ├── errorHandler.ts         # errorHandlerMiddleware — formats AppError subclasses into JSON responses
│   └── sentryMiddleware.ts     # setupSentryMiddleware / setupSentryErrorHandler wrappers
├── logger/
│   └── index.ts                # createLogger / getLogger — pino-based structured logger (Node.js only)
├── sentry/
│   ├── config.ts               # initializeSentry for Node.js / Express
│   └── configReact.ts          # initializeReactSentry for React apps
├── utils/
│   ├── asyncHandler.ts         # asyncHandler(fn) — wraps async Express handlers, forwards errors to next()
│   └── sanitizer.ts            # sanitizeData / sanitizeUrl — strip sensitive fields before logging/Sentry
├── db/
│   └── transactionHandler.ts   # withTransaction(prisma, fn, label) — Prisma transaction wrapper
└── __tests__/                  # Top-level integration tests
dist/                           # Compiled CJS/ESM output — do not edit
```

## Entry Points

Each entry point is a thin re-export file. **Never import across entry points** — use the one that matches the runtime.

| Import path                      | What it provides                                                              |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `@dotevolve/error-utils`         | Core error classes and `ErrorCategory`                                        |
| `@dotevolve/error-utils/node`    | Errors, middleware, logger, `asyncHandler`, `withTransaction`, sanitizers     |
| `@dotevolve/error-utils/express` | Same as `/node` minus the pino logger                                         |
| `@dotevolve/error-utils/react`   | Error classes, `initializeReactSentry`, sanitizers, `@sentry/react` re-export |

## Module Responsibilities

- **`errors/`** — defines `AppError` (base class, `isOperational = true`) and all typed subclasses (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`). Never throw raw `Error` objects — always use a typed subclass.
- **`middleware/`** — Express middleware only. `errorHandlerMiddleware` is the single place that converts `AppError` subclasses into HTTP responses. Register `correlationIdMiddleware` before routes; register `setupSentryErrorHandler` last.
- **`logger/`** — pino-based structured logger, Node.js only. Use `createLogger` / `getLogger` instead of `console.log` in all backend services.
- **`sentry/`** — Sentry initialisation helpers. `initializeSentry` must be called before any route or middleware registration. `initializeReactSentry` is called in `instrument.ts` before the React app mounts.
- **`utils/`** — `asyncHandler` wraps async Express route handlers so thrown errors reach `next()`. `sanitizeData` / `sanitizeUrl` strip sensitive fields before attaching data to Sentry or log entries.
- **`db/`** — `withTransaction` wraps Prisma transactions and rolls back on any thrown error. Never call `prisma.$transaction` directly in service code.

## Key Conventions

- **Throw typed errors, never raw responses.** Use the most specific `AppError` subclass and let `errorHandlerMiddleware` format the response. Never write `res.status(4xx).json(...)` directly.
- **`asyncHandler` is mandatory** for every async Express route — it ensures errors propagate to the centralized handler.
- **`initializeSentry` must be called first** — before any other middleware or route registration.
- **Propagate `correlationId`** — pass it when constructing errors so it appears in Sentry events and API responses.
- **Sanitize before logging** — run user-supplied data through `sanitizeData` before attaching it to Sentry context or log entries.
- **`express`, `react`, and `react-dom` are peer dependencies** — never bundle them. Run `npm run build` (tsc) before publishing.
- **Each subdirectory owns its own `__tests__/`** — unit tests live alongside the module they test.
