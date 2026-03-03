# @dotevolve/error-utils

[![Socket Badge](https://badge.socket.dev/npm/package/@dotevolve/error-utils/1.0.2)](https://badge.socket.dev/npm/package/@dotevolve/error-utils/1.0.2)

Shared error handling utilities with Sentry integration for dot-cOS microservices.

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

Or install directly from GitHub:

```bash
npm install github:DotEvolve/dot-error-utils
```

## Quick Start

### 1. Initialize Sentry

```javascript
const { initializeSentry } = require("@dotevolve/error-utils");

initializeSentry({
  dsn: process.env.SENTRY_DSN,
  serviceName: "workflow-service",
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
});
```

### 2. Setup Express Middleware

```javascript
const express = require("express");
const {
  setupSentryMiddleware,
  setupSentryErrorHandler,
  correlationIdMiddleware,
} = require("@dotevolve/error-utils");

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

### 3. Use Custom Error Classes

```javascript
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  asyncHandler,
} = require("@dotevolve/error-utils");

app.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

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

### 4. Use Transaction Handler

```javascript
const { withTransaction } = require("@dotevolve/error-utils");

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

## API Reference

### Error Classes

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

### Middleware

#### `setupSentryMiddleware(app)`

Sets up Sentry request handler, tracing, and correlation ID middleware.

#### `correlationIdMiddleware`

Generates or preserves correlation IDs for request tracing.

#### `setupSentryErrorHandler(app)`

Sets up Sentry error handler and custom error response middleware.

#### `attachSentryContext`

Attaches user and request context to Sentry events.

### Utilities

#### `asyncHandler(fn)`

Wraps async route handlers to catch promise rejections.

#### `withTransaction(prisma, callback, operationName)`

Wraps Prisma transactions with Sentry performance monitoring.

#### `sanitizeData(data, sensitiveFields?)`

Sanitizes sensitive data by replacing values with '[REDACTED]'.

### Sentry Configuration

#### `initializeSentry(config)`

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
SENTRY_RELEASE=v1.0.0
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
