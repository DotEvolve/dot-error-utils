# Implementation Plan: sentry-pino-logging

## Overview

Implement Sentry-forwarding structured logging across `@dotevolve/error-utils` for both Node.js (Pino multistream) and browser/React contexts (thin Sentry wrapper), add a `./browser` entry point safe for Chrome Extension Service Workers, and migrate `govnix-mca-extension` to consume these new utilities.

## Tasks

- [x] 1. Create shared logger type definitions
  - Create `src/types/logger.ts` with the `LogMeta` interface and `BrowserLogger` interface as specified in the design
  - Ensure `BrowserLogger` overloads cover all call signatures: `(msg: string)`, `(obj: LogMeta, msg: string)`, and the `(obj: LogMeta | Error, msg?: string)` form for `error`/`fatal`
  - Export both `LogMeta` and `BrowserLogger` as named exports
  - _Requirements: 3.2_

- [x] 2. Enhance Node.js logger with Pino multistream and Sentry forwarding
  - [x] 2.1 Implement the Sentry stream in `src/logger/index.ts`
    - Add the `PINO_TO_SENTRY_LEVEL` constant mapping Pino numeric levels to Sentry `SeverityLevel` strings
    - Implement `createSentryStream()` returning a `Writable` that JSON-parses each chunk, routes records with `level >= 50` to `Sentry.captureException`, routes `level >= 30 && level < 50` to `Sentry.addBreadcrumb`, and silences `level < 30`
    - Handle Pino's serialized error shape (`{ message, stack, type }` plain object) — do not use `instanceof Error` on deserialized values
    - Wrap the entire `write` callback body in try/catch; always call `callback()` even on parse errors
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_
  - [x] 2.2 Wire multistream into `createLogger`
    - Replace `pino({ ... })` with `pino({ ... }, pino.multistream([{ stream: process.stdout }, { stream: sentryStream }]))` in the non-test branch
    - Change the return type of `createLogger` and `getLogger` from `Logger` (pino) to `BrowserLogger`
    - Cast the existing `noopLogger` to `BrowserLogger` so it satisfies the new return type
    - Preserve the `NODE_ENV === 'test'` guard — return noop without constructing multistream or Sentry stream
    - _Requirements: 1.1, 1.5, 2.1, 2.2, 2.3_
  - [x] 2.3 Write property test for Pino level-to-Sentry routing
    - **Property 8: Pino level to Sentry level mapping is exhaustive**
    - For any level in `[10, 20, 30, 40, 50, 60]`, the stream must produce a valid `SeverityLevel` value
    - **Validates: Requirements 1.6**
    - _File: `src/__tests__/logger-node.property.test.ts`_
  - [x] 2.4 Write unit tests for Node logger Sentry stream
    - Test that `level >= 50` calls `Sentry.captureException`
    - Test that `level >= 30 && level < 50` calls `Sentry.addBreadcrumb` with correct mapped level
    - Test that `level < 30` calls neither Sentry API
    - Test that a serialized error object (`{ message, stack }`) is reconstructed as an `Error` before `captureException`
    - Test that JSON parse failures are swallowed and `callback()` is still called
    - Test that `NODE_ENV === 'test'` returns noop without Sentry calls
    - _File: `src/__tests__/logger-node.test.ts`_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Implement browser logger (`src/logger/react.ts`)
  - [x] 3.1 Implement `createBrowserLogger` and the `BrowserLogger` singleton
    - Create `src/logger/react.ts` — must not import `pino`
    - Implement `createBrowserLogger(serviceName, bindings)` returning a `BrowserLogger` that calls `Sentry.captureException` on `error`/`fatal`, `Sentry.addBreadcrumb` on `info`/`warn`, and `console.debug` only on `debug`
    - Every method must also call the corresponding `console.*` method
    - Implement `child(bindings)` to merge parent bindings with child bindings in all subsequent Sentry context
    - Implement module-level singleton pattern: `createLogger` sets it, `getLogger` returns it with noop fallback
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [x] 3.2 Write property test for browser logger error routing
    - **Property 1: Error/fatal log levels always produce Sentry exceptions**
    - For any `LogMeta` and string message, `logger.error(meta, msg)` always calls `captureException` with an `Error`
    - **Validates: Requirements 1.2, 3.3**
    - _File: `src/__tests__/logger-browser.property.test.ts`_
  - [x] 3.3 Write property test for browser logger breadcrumb routing
    - **Property 2: Info/warn log levels always produce Sentry breadcrumbs**
    - For any `LogMeta` and string message, `logger.info(meta, msg)` and `logger.warn(meta, msg)` always call `addBreadcrumb` with the correct mapped Sentry level
    - **Validates: Requirements 1.3, 3.4**
    - _File: `src/__tests__/logger-browser.property.test.ts`_
  - [x] 3.4 Write property test for debug Sentry silence
    - **Property 3: Debug log level never touches Sentry**
    - For any call to `logger.debug(...)`, no `captureException` or `addBreadcrumb` call occurs
    - **Validates: Requirements 1.4, 3.5**
    - _File: `src/__tests__/logger-browser.property.test.ts`_
  - [x] 3.5 Write property test for Error instance pass-through
    - **Property 4: Error instance pass-through**
    - For any `Error` instance passed as first argument to `logger.error(errorInstance, msg)`, the same instance is passed to `captureException` without being wrapped
    - **Validates: Requirements 2.2**
    - _File: `src/__tests__/logger-browser.property.test.ts`_
  - [x] 3.6 Write property test for string-only call wrapping
    - **Property 5: String-only call wraps in Error**
    - For any string `msg` passed as the sole argument to `logger.error(msg)`, `captureException` is called with `new Error(msg)`
    - **Validates: Requirements 2.3**
    - _File: `src/__tests__/logger-browser.property.test.ts`_
  - [x] 3.7 Write property test for child logger binding inheritance
    - **Property 6: Child logger inherits bindings**
    - For any parent `BrowserLogger` with bindings `b1` and a child created with `b2`, all log calls on the child include both `b1` and `b2` in the Sentry `extra` context
    - **Validates: Requirements 3.2**
    - _File: `src/__tests__/logger-browser.property.test.ts`_
  - [x] 3.8 Write unit tests for browser logger
    - Test `getLogger` returns noop before `createLogger` is called
    - Test `getLogger` returns singleton after `createLogger` is called
    - Test `logger.debug` calls `console.debug` and no Sentry API
    - Test `logger.info` calls `addBreadcrumb` with `level: "info"`
    - Test `logger.warn` calls `addBreadcrumb` with `level: "warning"`
    - Test `logger.error(msg)` calls `captureException` with a wrapped `Error`
    - Test `logger.error(errorInstance, msg)` passes the `Error` directly
    - Test `logger.fatal(msg)` calls `captureException` with `level: "fatal"`
    - _File: `src/__tests__/logger-browser.test.ts`_
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint — verify Node and browser loggers
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `initializeBrowserSentry` (`src/sentry/configBrowser.ts`)
  - [x] 5.1 Create `src/sentry/configBrowser.ts`
    - Export `BrowserSentryConfig` interface with fields: `dsn`, `serviceName?`, `environment?`, `release?`, `tracesSampleRate?`, `sensitiveFields?` — no replay or profiling fields
    - Implement `initializeBrowserSentry` using `@sentry/browser`, applying `browserTracingIntegration()` only
    - Apply the same `beforeSend` sanitization pattern as `initializeReactSentry`, reusing `sanitizeData` and `sanitizeUrl` from `src/utils/sanitizer.ts`
    - Apply the same `beforeBreadcrumb` sanitization pattern
    - Call `createLogger(config.serviceName ?? 'browser')` after `Sentry.init` so the singleton is ready immediately
    - Return `typeof Sentry`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 5.2 Write unit tests for `initializeBrowserSentry`
    - Test `Sentry.init` is called with the provided DSN and environment
    - Test only `browserTracingIntegration` is applied (no replay, no profiling)
    - Test `beforeSend` sanitizes `event.request.data`
    - Test `beforeBreadcrumb` sanitizes `breadcrumb.data`
    - Test `createLogger(serviceName)` is called after init
    - Test `"browser"` is the default `serviceName`
    - _File: `src/__tests__/configBrowser.test.ts`_
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Add `@sentry/browser` dependency and bump version in `package.json`
  - Add `"@sentry/browser": "^10.46.0"` to `dependencies`
  - Bump version from `1.0.10` to `1.0.11`
  - _Requirements: 5.7, 7.1_

- [x] 7. Create the `./browser` entry point
  - [x] 7.1 Create `src/browser.ts`
    - Export error classes (`AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`) from `./errors/AppError`
    - Export `ErrorCategory` and `ErrorCategoryType` from `./errors/ErrorCategory`
    - Export `initializeBrowserSentry` and `BrowserSentryConfig` from `./sentry/configBrowser`
    - Export `createLogger`, `getLogger` from `./logger/react`
    - Export `BrowserLogger`, `LogMeta` from `./types/logger`
    - Export `sanitizeData`, `sanitizeUrl` from `./utils/sanitizer`
    - Must NOT import or re-export anything from `@sentry/react` or `./sentry/configReact`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 7.2 Register `./browser` in `package.json` exports map
    - Add `"./browser": { "types": "./dist/browser.d.ts", "require": "./dist/browser.js" }` to `exports`
    - _Requirements: 4.1_

- [x] 8. Update `./react` entry point to export logger
  - Modify `src/react.ts` to also export `createLogger`, `getLogger` from `./logger/react` and `BrowserLogger`, `LogMeta` from `./types/logger`
  - Preserve all existing exports unchanged
  - _Requirements: 6.1, 6.2_

- [x] 9. Verify build compiles cleanly
  - Run `npm run build` and confirm zero TypeScript errors
  - Confirm `dist/browser.js`, `dist/browser.d.ts`, `dist/react.js`, and `dist/react.d.ts` are emitted correctly
  - _Requirements: 7.2_

- [x] 10. Checkpoint — full test suite green, build clean
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Migrate `govnix-mca-extension/src/background.ts`
  - [x] 11.1 Replace direct Sentry usage in `background.ts`
    - Import `initializeBrowserSentry` and `createLogger` from `@dotevolve/error-utils/browser`
    - Replace `Sentry.init(...)` with `initializeBrowserSentry({ dsn, environment, release, tracesSampleRate, serviceName: 'mca-extension-background' })`
    - Remove the inline `sanitizeData` function entirely
    - Replace every `console.log(...)` call with `logger.info(...)`
    - Remove the `@sentry/browser` import entirely
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 12.1_

- [x] 12. Migrate `govnix-mca-extension/src/main.tsx`
  - [x] 12.1 Replace direct Sentry.init in `main.tsx`
    - Import `initializeReactSentry` and `createLogger` from `@dotevolve/error-utils/react`
    - Replace `import * as Sentry from "@sentry/react"; Sentry.init(...)` with `initializeReactSentry({ dsn, environment, release, tracesSampleRate, replaysSessionSampleRate, replaysOnErrorSampleRate })`
    - Call `createLogger('govnix-mca-extension-popup')` to initialize the popup singleton
    - Remove the direct `Sentry.init` call
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 12.2_

- [x] 13. Migrate `govnix-mca-extension/src/utils/errorHandler.ts`
  - [x] 13.1 Replace direct Sentry API calls in `errorHandler.ts`
    - Import `getLogger` from `@dotevolve/error-utils/react` instead of `@sentry/browser`
    - Replace `Sentry.captureException(error, { extra: { errorType: 'network_error', source: 'extension' } })` with `getLogger().error({ errorType: 'network_error', source: 'extension' }, (error as Error).message ?? 'Network error')`
    - Replace the non-validation `Sentry.captureException(...)` call with `getLogger().error({ correlationId, category, code, status, url, method }, errorResponse.error?.message)`
    - Replace the validation `Sentry.addBreadcrumb(...)` call with `getLogger().warn({ correlationId, category, code }, errorResponse.error?.message)` — this preserves breadcrumb-not-exception intent for `ErrorCategory.VALIDATION`
    - Remove the `@sentry/browser` import entirely
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.3_

- [x] 14. Add `@dotevolve/error-utils` to `govnix-mca-extension/package.json`
  - Add `"@dotevolve/error-utils": "^1.0.11"` to `dependencies`
  - _Requirements: 11.1, 11.2_

- [x] 15. Final checkpoint — extension builds, all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The `NODE_ENV === 'test'` guard in `src/logger/index.ts` must remain in place — existing tests depend on it
- Property tests use `fast-check` with a minimum of 100 iterations per property
- The `govnix-mca-extension` migration tasks (11–14) must be run against the extension repo, not `dot-error-utils`
- Content scripts (`authSync.ts`, `mcaInjector.ts`) must remain completely unchanged per Requirements 12.4

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 3, "tasks": ["2.3", "2.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1", "7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] },
    { "id": 6, "tasks": ["9.1", "11.1", "12.1"] },
    { "id": 7, "tasks": ["13.1"] },
    { "id": 8, "tasks": ["14.1"] }
  ]
}
```
