# Implementation Plan: error-utils-integration

## Overview

Wire `@dotevolve/error-utils` consistently across `floorix-api`, `floorix-admin`, and `floorix-app`. The API needs minor fixes; Admin needs interceptor and page-level updates; Client needs the most work (Sentry init migration, ErrorBoundary, interceptor, thunk, and dashboard components).

## Tasks

- [x] 1. Fix API — Sentry initialisation and catch-all route
  - [x] 1.1 Add `release` field to `initializeSentry` call in `server.ts` and add missing-DSN warning
    - Pass `release` (e.g. from `process.env.npm_package_version`) alongside existing `serviceName` and `environment`
    - Add `if (!process.env.SENTRY_DSN) console.warn(...)` guard before the call
    - _Requirements: 1.2, 1.3_
  - [x] 1.2 Write unit test: missing SENTRY_DSN logs warning and does not throw
    - _Requirements: 1.3_
  - [x] 1.3 Replace `new Error(...)` in the catch-all `app.all` route with `new NotFoundError`
    - Import `NotFoundError` from `@dotevolve/error-utils/express`
    - `next(new NotFoundError('Route', req.originalUrl))`
    - _Requirements: 3.2, 15.1_
  - [x] 1.4 Write property test for catch-all route returning 404 with standard shape
    - **Property 2: Typed error → correct HTTP status**
    - **Property 3: Standardised error response shape**
    - **Validates: Requirements 3.2, 4.1, 4.2**

- [x] 2. Fix API — Sentry context enrichment in protect middleware
  - [x] 2.1 Call `attachSentryContext` in `protect` middleware after `req.user` is set
    - Import `attachSentryContext` from `@dotevolve/error-utils/express`
    - Register it as middleware (pass `req, res, next`) or call directly with user context after `req.user = freshUser`
    - _Requirements: 5.1, 5.2_
  - [x] 2.2 Write unit test: authenticated route attaches user id and role to Sentry scope
    - _Requirements: 5.1_

- [x] 3. Verify API — asyncHandler and typed errors across all route handlers
  - [x] 3.1 Audit all route files to confirm every async handler is wrapped with `asyncHandler`
    - Fix any handler not yet wrapped
    - Remove any `res.status(4xx/5xx).json(...)` calls outside the centralised error handler
    - _Requirements: 3.1, 3.7, 3.8_
  - [x] 3.2 Write property test: X-Correlation-Id present on all API responses
    - **Property 1: Correlation ID present on all responses**
    - **Validates: Requirements 2.4**
  - [x] 3.3 Write property test: typed error maps to correct HTTP status code
    - **Property 2: Typed error → correct HTTP status**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 4.3**
  - [x] 3.4 Write property test: error response conforms to standard shape
    - **Property 3: Standardised error response shape**
    - **Validates: Requirements 4.1, 4.2**
  - [x] 3.5 Write property test: ValidationError is not captured in Sentry
    - **Property 4: ValidationError NOT captured in Sentry**
    - **Validates: Requirements 5.3**

- [x] 4. Checkpoint — API
  - Ensure all API tests pass, ask the user if questions arise.

- [x] 5. Fix Admin — Sentry DSN from environment variable
  - [x] 5.1 Replace hardcoded DSN in `src/lib/sentry.ts` with `import.meta.env.VITE_SENTRY_DSN`
    - Add missing-DSN warning: `if (!import.meta.env.VITE_SENTRY_DSN) console.warn(...)`
    - _Requirements: 6.2, 17.2, 17.4_
  - [x] 5.2 Document `VITE_SENTRY_DSN` in the Admin `.env.local` template
    - _Requirements: 17.2_

- [x] 6. Fix Admin — Axios interceptor Sentry capture
  - [x] 6.1 Add `Sentry.captureException` on 5xx responses in `src/lib/axios.ts`
    - Extract `correlationId` from `error.response?.data?.error?.correlationId`
    - Pass it as a Sentry tag: `{ tags: { correlationId }, extra: { url, status } }`
    - _Requirements: 8.1, 8.2_
  - [x] 6.2 Add `Sentry.captureException` on token refresh failure before redirect in `src/lib/axios.ts`
    - _Requirements: 8.3_
  - [x] 6.3 Write property test: Admin Axios 5xx captured in Sentry with correlationId
    - **Property 5: Admin Axios 5xx captured in Sentry with correlationId**
    - **Validates: Requirements 8.1, 8.2**

- [x] 7. Fix Admin — page-level error handling
  - [x] 7.1 Update `Dashboard.tsx`, `Tenants.tsx`, and `Plans.tsx` to capture 5xx errors via `Sentry.captureException`
    - On 4xx: display `error.response.data.error.message` to the user
    - On 5xx: call `Sentry.captureException(error)` and display a generic fallback
    - Remove bare `setError("An unexpected error occurred")` patterns
    - _Requirements: 9.1, 9.2, 9.3, 15.3_
  - [x] 7.2 Write property test: Admin page displays 4xx error.message from standardised response
    - **Property 6: Admin page displays 4xx error.message**
    - **Validates: Requirements 9.2**

- [x] 8. Checkpoint — Admin
  - Ensure all Admin tests pass, ask the user if questions arise.

- [x] 9. Create Client — `src/lib/sentry.ts` using `initializeReactSentry`
  - [x] 9.1 Create `src/lib/sentry.ts` in `floorix-app`
    - Import `initializeReactSentry` from `@dotevolve/error-utils/react`
    - Pass `dsn: import.meta.env.VITE_SENTRY_DSN`, `environment: import.meta.env.MODE`, `tracesSampleRate`, `replaysSessionSampleRate`, `replaysOnErrorSampleRate`
    - Add missing-DSN warning guard
    - _Requirements: 10.1, 10.2, 17.4_
  - [x] 9.2 Update `src/index.tsx` to import `./lib/sentry` as the first import and remove the raw `Sentry.init` call
    - _Requirements: 10.3, 16.3_
  - [x] 9.3 Document `VITE_SENTRY_DSN` in the Client `.env` template
    - _Requirements: 17.3_

- [x] 10. Add Client — `Sentry.ErrorBoundary` in `App.tsx`
  - [x] 10.1 Wrap the root component tree in `App.tsx` with `Sentry.ErrorBoundary` from `@sentry/react`
    - Provide a `fallback` prop with a user-facing message appropriate for factory operators
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 11. Fix Client — Axios interceptor Sentry capture
  - [x] 11.1 Add `Sentry.captureException` on 5xx responses in `src/utils/axios.ts`
    - `if (status >= 500) Sentry.captureException(error, { extra: { url, status } })`
    - _Requirements: 12.1_
  - [x] 11.2 Add `Sentry.addBreadcrumb` on 401 redirect in `src/utils/axios.ts`
    - Category `'auth'`, message `'Session expired — redirecting to login'`, level `'warning'`
    - _Requirements: 12.2_
  - [x] 11.3 Write property test: Client Axios 5xx captured in Sentry
    - **Property 7: Client Axios 5xx captured in Sentry**
    - **Validates: Requirements 12.1**

- [x] 12. Fix Client — `loginUser` thunk Sentry capture in `UserSlice`
  - [x] 12.1 Add `Sentry.captureException` in the `loginUser` catch block for non-4xx errors
    - `if (!status || status >= 500) Sentry.captureException(error, { tags: { thunk: 'loginUser' } })`
    - Use `error.response?.data?.error?.message` for the rejected value
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 12.2 Write property test: Redux thunk non-4xx errors captured in Sentry
    - **Property 8: Redux thunk errors captured in Sentry**
    - **Validates: Requirements 13.1, 13.2**

- [x] 13. Fix Client — dashboard component error handling
  - [x] 13.1 Update Client dashboard components to capture 5xx via `Sentry.captureException` and display `error.message` on 4xx
    - Mirror the same pattern used in Admin page components (task 7.1)
    - Remove bare `console.error` blocks that discard error context
    - _Requirements: 14.1, 14.2, 14.3, 15.4_
  - [x] 13.2 Write property test: Client dashboard displays 4xx error.message from standardised response
    - **Property 9: Client dashboard displays 4xx error.message**
    - **Validates: Requirements 14.2**

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass across all three repos, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` and must run a minimum of 100 iterations
- Each property test must include the comment `// Feature: error-utils-integration, Property N: <property_text>`
- `attachSentryContext` in error-utils is Express middleware — register it correctly with `(req, res, next)` signature
- All Client imports from `@dotevolve/error-utils` must use the `/react` subpath (Requirements 16.3, 16.6)
