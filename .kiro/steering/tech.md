---
inclusion: always
---

# Tech Stack

## Core

| Concern        | Library                                             | Version |
| -------------- | --------------------------------------------------- | ------- |
| Language       | TypeScript                                          | 5.3.x   |
| Runtime        | Node.js                                             | 24.x    |
| Logging        | pino                                                | 10.x    |
| Error Tracking | @sentry/node, @sentry/react, @sentry/profiling-node | 10.x    |

## Build

- Built with **`tsc`** (plain TypeScript compiler — no bundler).
- Outputs to `dist/` — CJS only. Do not edit `dist/` directly.
- `prepublishOnly` runs `npm run build` automatically before publishing.
- Run `npm run build` after any source change to verify the compiled output is valid before publishing.

## Peer Dependencies

`express`, `react`, and `react-dom` are **peer dependencies** — never add them as regular dependencies and never bundle them. They must be provided by the consuming application.

## TypeScript

- Strict mode is enabled. All code must type-check cleanly — no `any` escapes without an explicit justification comment.
- Keep non-React, non-browser code isomorphic — it must work in both Node.js and browser environments.

## Testing

| Concern        | Library    | Version |
| -------------- | ---------- | ------- |
| Runner         | Vitest     | 1.x     |
| Property-Based | fast-check | 4.x     |

- Unit tests live alongside the module they test in a local `__tests__/` directory.
- Top-level `__tests__/` is for integration tests.
- Property-based tests use `fast-check` and run a minimum of 100 iterations per property.

## Common Commands

```bash
npm run build         # Compile TypeScript via tsc
npm test              # Run all tests (watch mode)
npm run test:watch    # Run tests in watch mode explicitly
```

## Key Constraints

- **Never import across entry points.** Use the entry point that matches the runtime (`/node`, `/express`, `/react`, or root).
- **Never throw raw `Error` objects.** Always use the most specific `AppError` subclass (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`).
- **Never write `res.status(4xx).json(...)` directly.** Throw the appropriate subclass and let `errorHandlerMiddleware` format the response.
- **`asyncHandler` is mandatory** for every async Express route handler — it forwards thrown errors to `next()`.
- **`initializeSentry` must be called first** — before any middleware or route registration.
- **Never call `prisma.$transaction` directly** — always use `withTransaction(prisma, fn, label)`.
- **Never use `console.log` in production code** — use `createLogger` / `getLogger` (Node.js only) from the `/node` entry point.
- **Sanitize before logging** — run user-supplied data through `sanitizeData` before attaching it to Sentry context or log entries.
