# Integration Guide for dot-error-utils

This guide walks through integrating `@dotevolve/error-utils` into each dot-cOS service.

## Package Structure

```
dot-error-utils/
├── src/
│   ├── errors/
│   │   ├── AppError.ts          # Base error class + 5 specific error types
│   │   └── ErrorCategory.ts     # Error category constants
│   ├── middleware/
│   │   ├── correlationId.ts     # Correlation ID middleware
│   │   ├── errorHandler.ts      # Centralized error handler
│   │   └── sentryMiddleware.ts  # Sentry request/tracing setup
│   ├── sentry/
│   │   └── config.ts            # Sentry initialization
│   ├── db/
│   │   └── transactionHandler.ts # Prisma transaction wrapper
│   ├── utils/
│   │   ├── asyncHandler.ts      # Async route handler wrapper
│   │   └── sanitizer.ts         # Data sanitization utilities
│   └── index.ts                 # Main export file
├── package.json
├── tsconfig.json
├── README.md
└── INTEGRATION_GUIDE.md (this file)
```

## Publishing the Package

### Option 1: GitHub Direct Install (Recommended for now)

1. Create a GitHub repository: `DotEvolve/dot-error-utils`
2. Push this code to the repository
3. Install in other services:

```bash
npm install github:DotEvolve/dot-error-utils
```

### Option 2: Private npm Package

1. Build the package:

```bash
npm run build
```

2. Publish to npm (requires npm organization):

```bash
npm publish --access restricted
```

3. Install in other services:

```bash
npm install @dotevolve/error-utils
```

## Integration Steps

### Backend Services (Node.js/Express)

Services to integrate:

- govnix-api-gateway
- govnix-workflow-service
- floorix-api
- dot-portal-api

#### Step 1: Install Dependencies

```bash
npm install @dotevolve/error-utils @sentry/node @sentry/profiling-node
```

#### Step 2: Initialize Sentry (app.js or index.js)

```javascript
const { initializeSentry } = require("@dotevolve/error-utils");

// Initialize Sentry FIRST (before any other code)
initializeSentry({
  dsn: process.env.SENTRY_DSN,
  serviceName: "workflow-service", // Change per service
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
});
```

#### Step 3: Setup Middleware

```javascript
const express = require("express");
const {
  setupSentryMiddleware,
  setupSentryErrorHandler,
  correlationIdMiddleware,
} = require("@dotevolve/error-utils");

const app = express();

// Body parser
app.use(express.json());

// 1. Sentry middleware (MUST BE FIRST)
setupSentryMiddleware(app);

// 2. Correlation ID middleware
app.use(correlationIdMiddleware);

// 3. Your authentication middleware
app.use(authMiddleware);

// 4. Your routes
app.use("/api/v1", routes);

// 5. Error handler (MUST BE LAST)
setupSentryErrorHandler(app);

app.listen(3000);
```

#### Step 4: Update Route Handlers

Replace generic errors with typed errors:

```javascript
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  asyncHandler,
} = require("@dotevolve/error-utils");

// Before:
app.get("/workflows/:id", async (req, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id },
    });
    if (!workflow) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// After:
app.get(
  "/workflows/:id",
  asyncHandler(async (req, res) => {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id },
    });

    if (!workflow) {
      throw new NotFoundError("Workflow", req.params.id);
    }

    res.json({ success: true, data: workflow });
  }),
);
```

#### Step 5: Update Prisma Transactions

```javascript
const { withTransaction } = require("@dotevolve/error-utils");

// Before:
async function createWorkflow(data) {
  return await prisma.$transaction(async (tx) => {
    const workflow = await tx.workflow.create({ data });
    return workflow;
  });
}

// After:
async function createWorkflow(data) {
  return withTransaction(
    prisma,
    async (tx) => {
      const workflow = await tx.workflow.create({ data });
      return workflow;
    },
    "create_workflow",
  );
}
```

#### Step 6: Add Environment Variables

```bash
# .env
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
NODE_ENV=production
SENTRY_ENVIRONMENT=production
```

### Frontend (React + Vite)

Service: dot-cos-frontend

#### Step 1: Install Dependencies

```bash
npm install @sentry/react @sentry/vite-plugin
```

#### Step 2: Configure Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    process.env.NODE_ENV === "production" &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
  ].filter(Boolean),
  build: {
    sourcemap: true,
  },
});
```

#### Step 3: Initialize Sentry

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
});

// Then render app
```

#### Step 4: Add Error Boundary

```typescript
// src/App.tsx
import * as Sentry from '@sentry/react';

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <YourApp />
    </Sentry.ErrorBoundary>
  );
}
```

### Chrome Extension

Service: dot-cos-mca-extension

#### Step 1: Enhance Existing Sentry Setup

```typescript
// src/background.ts
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  tracesSampleRate: 1.0,

  // Add data sanitization
  beforeSend(event, hint) {
    // Remove sensitive data
    if (event.request?.data) {
      const sanitized = { ...event.request.data };
      delete sanitized.token;
      delete sanitized.password;
      event.request.data = sanitized;
    }
    return event;
  },
});
```

## Testing Integration

### 1. Test Error Responses

```bash
curl -X GET http://localhost:3000/api/v1/workflows/invalid-id
```

Expected response:

```json
{
  "success": false,
  "error": {
    "code": "not_found",
    "category": "not_found",
    "message": "Workflow not found: invalid-id",
    "correlationId": "abc123-def456"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Verify Sentry Integration

1. Trigger a 500 error
2. Check Sentry dashboard for the error
3. Verify correlation ID is present in Sentry event
4. Verify user context is attached

### 3. Test Transaction Rollback

```javascript
// This should rollback and not create partial data
await withTransaction(
  prisma,
  async (tx) => {
    await tx.workflow.create({ data: workflowData });
    throw new Error("Simulated failure"); // Should rollback workflow creation
  },
  "test_rollback",
);
```

## Rollout Strategy

1. **Phase 1**: govnix-workflow-service (pilot service)
   - Full integration
   - Test all error scenarios
   - Verify Sentry events

2. **Phase 2**: govnix-api-gateway
   - Add correlation ID propagation to downstream services
   - Test distributed tracing

3. **Phase 3**: floorix-api & govnix-admin
   - Parallel integration
   - Verify cross-service correlation

4. **Phase 4**: Frontend & Extension
   - Frontend error boundary
   - Extension error handling

## Troubleshooting

### Sentry not capturing errors

- Check SENTRY_DSN is set correctly
- Verify `initializeSentry()` is called before any other code
- Check error is 500+ or non-operational

### Correlation ID not appearing

- Verify `setupSentryMiddleware()` is called before routes
- Check response headers for X-Correlation-Id

### Transaction not rolling back

- Ensure using `withTransaction` wrapper
- Check Prisma transaction syntax
- Verify error is thrown inside transaction callback

## Next Steps

After integration:

1. Monitor Sentry dashboard for error patterns
2. Set up Sentry alerts for critical errors
3. Review and tune tracesSampleRate for production
4. Add custom Sentry tags for business metrics
