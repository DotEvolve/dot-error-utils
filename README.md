# @dotevolve/error-utils

Shared error handling utilities with Sentry integration for DotEvolve, Govnix and Floorix microservices.

## Features

- 🎯 **6-Category Error Classification**: validation, authentication, authorization, conflict, not_found, system
- 🔍 **Distributed Tracing**: Sentry trace IDs for cross-service request tracking
- 🛡️ **Data Sanitization**: Automatic scrubbing of sensitive fields (passwords, tokens, etc.)
- 📊 **Performance Monitoring**: Sentry transaction tracking for database operations
- 🔄 **Transaction Safety**: Prisma transaction wrapper with automatic rollback
- 🎨 **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install @dotevolve/error-utils @sentry/node @sentry/profiling-node
```

## Subpath Exports

As of **v1.0.7**, the package is split into three environment-specific entry points to keep bundles lean and prevent peer dependency conflicts:

| Import path                      | Use case                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `@dotevolve/error-utils/node`    | Node.js services — `initializeSentry`, `withTransaction`, error classes                                                         |
| `@dotevolve/error-utils/express` | Express apps — all of the above + `setupSentryMiddleware`, `correlationIdMiddleware`, `setupSentryErrorHandler`, `asyncHandler` |
| `@dotevolve/error-utils/react`   | React apps — `initializeReactSentry`, error classes                                                                             |
| `@dotevolve/error-utils`         | Root — all exports (convenience, same as `/express`)                                                                            |

## Quick Start

### Node.js / Express API

#### 1. Initialize Sentry in your server entry point

```javascript
// server.js
const { initializeSentry } = require("@dotevolve/error-utils/node");

initializeSentry({
  dsn: process.env.SENTRY_DSN,
  serviceName: "my-service",
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
});
```

#### 2. Setup Express Middleware

```javascript
// app.js
const express = require("express");
const {
  setupSentryMiddleware,
  setupSentryErrorHandler,
  correlationIdMiddleware,
} = require("@dotevolve/error-utils/express");

const app = express();

// 1. Sentry middleware (must be first)
setupSentryMiddleware(app);

// 2. Correlation ID middleware
app.use(correlationIdMiddleware);

// Your routes here
app.use("/api", routes);

// 3. Error handler (must be last)
setupSentryErrorHandler(app);
```

#### 3. Use Custom Error Classes

```javascript
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  asyncHandler,
} = require("@dotevolve/error-utils/express");

app.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new NotFoundError("User", req.params.id);
    }

    if (!req.user.canViewUser(user)) {
      throw new AuthorizationError("Cannot view this user");
    }

    res.json({ success: true, data: user });
  }),
);
```

#### 4. Use Transaction Handler

```javascript
const { withTransaction } = require("@dotevolve/error-utils/node");

async function createWorkflowWithSteps(data) {
  return withTransaction(
    prisma,
    async (tx) => {
      const workflow = await tx.workflow.create({ data: data.workflow });
      const steps = await tx.workflowStep.createMany({
        data: data.steps.map((s) => ({ ...s, workflowId: workflow.id })),
      });
      return { workflow, steps };
    },
    "create_workflow_with_steps",
  );
}
```

### React App

#### Initialize Sentry in your app entry point

```typescript
// src/lib/sentry.ts
import { initializeReactSentry } from "@dotevolve/error-utils/react";

initializeReactSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: import.meta.env.DEV,
});
```

## API Reference

### Error Classes

Available from all three subpaths.

#### `AppError`

Base error class with Sentry integration.

```typescript
new AppError(message: string, statusCode: number, category: string, details?: any)
```

#### `ValidationError` (400)

```typescript
new ValidationError(message: string, details?: Record<string, string[]>)
```

#### `AuthenticationError` (401)

```typescript
new AuthenticationError(message?: string)
```

#### `AuthorizationError` (403)

```typescript
new AuthorizationError(message?: string)
```

#### `NotFoundError` (404)

```typescript
new NotFoundError(resource: string, identifier?: string)
```

#### `ConflictError` (409)

```typescript
new ConflictError(message: string, details?: any)
```

### Middleware (`/express`)

#### `setupSentryMiddleware(app)`

Sets up Sentry request handler, tracing, and correlation ID middleware.

#### `correlationIdMiddleware`

Generates or preserves correlation IDs for request tracing.

#### `setupSentryErrorHandler(app)`

Sets up Sentry error handler and custom error response middleware.

#### `attachSentryContext`

Attaches user and request context to Sentry events.

#### `asyncHandler(fn)`

Wraps async route handlers to catch promise rejections.

### Utilities (`/node` and `/express`)

#### `withTransaction(prisma, callback, operationName)`

Wraps Prisma transactions with Sentry performance monitoring.

#### `sanitizeData(data, sensitiveFields?)`

Sanitizes sensitive data by replacing values with `'[REDACTED]'`.

### Sentry Configuration

#### `initializeSentry(config)` — `/node` and `/express`

```typescript
interface SentryConfig {
  dsn: string;
  serviceName: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  sensitiveFields?: string[];
}
```

#### `initializeReactSentry(config)` — `/react`

```typescript
interface ReactSentryConfig {
  dsn: string;
  environment?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  debug?: boolean;
}
```

## Error Response Format

All errors return a standardized JSON response:

```json
{
  "success": false,
  "error": {
    "code": "validation",
    "category": "validation",
    "message": "Invalid input data",
    "correlationId": "abc123-def456-ghi789",
    "details": {
      "email": ["Email is required", "Email must be valid"]
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Environment Variables

```bash
# Required
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]

# Optional
NODE_ENV=production
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.0.7
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENSITIVE_FIELDS=customField1,customField2
```

## Best Practices

1. **Always use `asyncHandler`** for async route handlers
2. **Use specific error classes** instead of generic `Error`
3. **Include validation details** in `ValidationError` for field-level feedback
4. **Use `withTransaction`** for all multi-step database operations
5. **Set correlation ID** in inter-service HTTP calls
6. **Don't capture validation errors** to Sentry (they're user errors, not system errors)
7. **Import from the correct subpath** — use `/express` for Express apps, `/node` for plain Node, and `/react` for React apps

## Changelog

### v1.0.7

- **Fixed**: Updated `exports` map to use `import`/`require` conditions (was `default`) — fixes `TS2307` in TypeScript projects using `moduleResolution: bundler`
- **Added**: Root `.` export as an alias for `/express` for backwards compatibility
- **Docs**: Updated README to document subpath exports API

### v1.0.6

- Added subpath exports: `./node`, `./express`, `./react`
- Added React Sentry integration via `initializeReactSentry`

## CI/CD

This package uses GitHub Actions for CI (testing) and CD (publishing).

### Branching Strategy

- `master`: Production-ready branch. Pushes to this branch trigger an NPM publish.
- `dev`: Development branch. All feature work should be merged here first.
- **Pull Requests**: Pull requests should be raised from feature branches to `dev` or from `dev` to `master`.

### Workflows

1. **CI** ([ci.yml](.github/workflows/ci.yml)): Runs on pushes to `dev` and pull requests to `master`. It performs `npm test` and `npm build`.
2. **Publish** ([publish.yml](.github/workflows/publish.yml)): Runs only on pushes to `master`. It performs `npm test`, `npm build`, and `npm publish`.

### Configuration

To enable automated publishing, you must configure a GitHub Environment:

1. Go to your repository on GitHub.
2. Navigate to **Settings** -> **Environments**.
3. Click **New environment** and name it `production`.
4. (Optional) Add **Deployment protection rules** like "Required reviewers" for manual approval.
5. In the `production` environment, click **Add secret**.
6. Name: `NPM_TOKEN`
7. Value: Your npm automation token.

> [!NOTE]
> By using an environment, you can control which branches can deploy and require manual sign-off before publishing to NPM.

## License

ISC
