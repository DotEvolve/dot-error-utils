# Requirements Document

## Introduction

This feature adds structured Sentry-forwarding logging to `@dotevolve/error-utils` across two complementary layers:

1. **Node.js logger enhancement** — extend the existing Pino singleton in `src/logger/index.ts` to forward log records to Sentry via a multistream. `error`/`fatal` calls produce Sentry exceptions; `info`/`warn` calls produce Sentry breadcrumbs; `debug` is Sentry-silent.

2. **Browser/React logger (new)** — add `src/logger/react.ts`, a thin Sentry wrapper that exposes the same `createLogger`/`getLogger` API without Pino, keeping browser bundle size minimal. Export it from both the existing `./react` entry point and a new `./browser` entry point.

3. **Browser Sentry initializer (new)** — add `src/sentry/configBrowser.ts` with `initializeBrowserSentry`, a `@sentry/browser`-based initializer optimized for Chrome Extension Service Workers (no replay, no profiling, no React integrations). Export from the `./browser` entry point.

4. **`govnix-mca-extension` migration** — consume the new entry points in the extension, replacing all direct `Sentry.init`, `Sentry.captureException`, and `console.log` calls in `background.ts`, `main.tsx`, and `src/utils/errorHandler.ts`.

The net result is a single, canonical logging path across every DotEvolve application: developers call `logger.error(...)` and the platform routes that call to Sentry as an exception, with all other log levels becoming Sentry breadcrumbs — without any direct Sentry API usage outside of `@dotevolve/error-utils`.

---

## Glossary

- **error-utils**: The `@dotevolve/error-utils` npm package.
- **Node_Logger**: The Pino-based logger created by `createLogger` / retrieved by `getLogger` from `@dotevolve/error-utils/node`.
- **Browser_Logger**: The thin Sentry-forwarding logger created by `createLogger` / retrieved by `getLogger` from `@dotevolve/error-utils/react` or `@dotevolve/error-utils/browser`.
- **BrowserLogger_Interface**: The TypeScript interface `{ debug, info, warn, error, fatal, child }` that both the Node noop shim and Browser_Logger must satisfy.
- **Sentry_Breadcrumb**: A Sentry breadcrumb record added via `Sentry.addBreadcrumb(...)`.
- **Sentry_Exception**: A Sentry issue created via `Sentry.captureException(...)`.
- **initializeBrowserSentry**: The new `@sentry/browser`-based initializer for non-React browser contexts (e.g. Chrome Extension Service Workers).
- **initializeReactSentry**: The existing `@sentry/react`-based initializer in `src/sentry/configReact.ts`.
- **`./browser` entry point**: The new `@dotevolve/error-utils/browser` package export, intended for Chrome Extension Service Workers. Must not bundle `@sentry/react` or `react`.
- **Extension_Background**: `govnix-mca-extension/src/background.ts` — the Chrome Extension Service Worker context.
- **Extension_Popup**: `govnix-mca-extension/src/main.tsx` and associated popup React components.
- **ErrorHandler**: `govnix-mca-extension/src/utils/errorHandler.ts` — the `ExtensionErrorHandler` class.
- **Sentry_Level**: Sentry severity: `debug`, `info`, `warning`, `error`, `fatal`.

---

## Requirements

### Requirement 1: Node Logger — Sentry Forwarding via Pino Multistream

**User Story:** As a backend service developer, I want `logger.error(...)` and `logger.fatal(...)` calls to automatically create Sentry issues, and `logger.info(...)` and `logger.warn(...)` calls to add Sentry breadcrumbs, so I never need to call Sentry APIs directly in service code.

#### Acceptance Criteria

1. WHEN `createLogger(serviceName)` is called in a non-test environment, THE Node_Logger SHALL use `pino.multistream` to write to both `process.stdout` and a custom Sentry stream.
2. WHEN the Sentry stream receives a log record with `level >= 50` (`error` or `fatal`), THE Node_Logger SHALL call `Sentry.captureException` with the log message wrapped in an `Error` (if not already an `Error`) and the full parsed log object attached as Sentry `extra` context.
3. WHEN the Sentry stream receives a log record with `level >= 30` and `level < 50` (`info` or `warn`), THE Node_Logger SHALL call `Sentry.addBreadcrumb` with the message, the mapped Sentry level, and any extra fields from the log object attached as `data`.
4. WHEN the Sentry stream receives a log record with `level < 30` (`debug` or `trace`), THE Node_Logger SHALL NOT call any Sentry API.
5. WHEN `NODE_ENV === 'test'`, `createLogger` SHALL return the existing no-op logger — no Sentry calls, no multistream.
6. THE Sentry stream SHALL map Pino levels to Sentry levels as follows: `10/20` → `debug`, `30` → `info`, `40` → `warning`, `50` → `error`, `60` → `fatal`.

---

### Requirement 2: Node Logger — Object Merging and Error Instance Handling

**User Story:** As a developer, I want to pass a structured context object as the first argument to the logger (e.g. `logger.error({ correlationId, userId }, 'request failed')`) and have those fields appear as Sentry context on the captured exception.

#### Acceptance Criteria

1. WHEN `logger.error(mergeObject, message)` is called, THE Node_Logger SHALL attach `mergeObject` as the `extra` context on the Sentry exception.
2. WHEN `logger.error(errorInstance, message)` is called and the first argument is an `Error` object, THE Node_Logger SHALL pass that `Error` directly to `Sentry.captureException` rather than wrapping it in a new `Error`.
3. WHEN `logger.error(message)` is called with only a string, THE Node_Logger SHALL wrap the string in `new Error(message)` before calling `Sentry.captureException`.

---

### Requirement 3: Browser Logger — Thin Sentry Wrapper

**User Story:** As a React or Chrome Extension popup developer, I want the same `createLogger`/`getLogger` API available in browser contexts, routing calls to Sentry without adding Pino to the bundle.

#### Acceptance Criteria

1. THE `src/logger/react.ts` module SHALL export `createLogger(serviceName: string): BrowserLogger` and `getLogger(): BrowserLogger`.
2. THE `BrowserLogger` interface SHALL expose methods: `debug`, `info`, `warn`, `error`, `fatal` (each accepting an optional merge object and a message string), and `child(bindings)` returning a new `BrowserLogger` with the bindings merged into all subsequent log call data.
3. WHEN `Browser_Logger.error(...)` or `Browser_Logger.fatal(...)` is called, THE logger SHALL call `Sentry.captureException` using the `@sentry/react` SDK, passing any structured object argument as `extra` context.
4. WHEN `Browser_Logger.info(...)` or `Browser_Logger.warn(...)` is called, THE logger SHALL call `Sentry.addBreadcrumb` using the `@sentry/react` SDK, with the mapped Sentry level and any structured object as `data`.
5. WHEN `Browser_Logger.debug(...)` is called, THE logger SHALL call `console.debug` only — no Sentry API call.
6. Every `Browser_Logger` method SHALL also call the corresponding `console.*` method so output remains visible in DevTools.
7. THE singleton pattern SHALL mirror the Node logger: `createLogger` sets a module-level singleton; `getLogger` returns it with a noop fallback.
8. THE browser logger SHALL NOT import `pino`.

---

### Requirement 4: `./browser` Entry Point

**User Story:** As a Chrome Extension developer, I want a dedicated `@dotevolve/error-utils/browser` entry point that provides `initializeBrowserSentry`, `createLogger`, and `getLogger` without bundling `@sentry/react` or `react`, so the extension's service worker background script does not accidentally include React-dependent code.

#### Acceptance Criteria

1. THE `./browser` entry point SHALL be added to the `exports` map in `package.json` pointing to `dist/browser.js` / `dist/browser.d.ts`.
2. `src/browser.ts` SHALL export: `initializeBrowserSentry`, `createLogger`, `getLogger`, `sanitizeData`, `sanitizeUrl`, error classes, `ErrorCategory`.
3. `src/browser.ts` SHALL NOT import or re-export anything from `@sentry/react`.
4. `src/browser.ts` SHALL NOT import or re-export anything from `./sentry/configReact`.
5. THE `./browser` entry point SHALL compile cleanly under the existing `tsconfig.json` (CJS output, ES2020 target).

---

### Requirement 5: `initializeBrowserSentry`

**User Story:** As a Chrome Extension developer, I want a Sentry initializer that works in the Service Worker context — which has no DOM, no `window`, no replay, and no React — so I can replace the manual `Sentry.init` call in `background.ts` with a shared utility.

#### Acceptance Criteria

1. `src/sentry/configBrowser.ts` SHALL export `initializeBrowserSentry(config: BrowserSentryConfig): typeof Sentry` using `@sentry/browser`.
2. THE `BrowserSentryConfig` interface SHALL include: `dsn: string`, `environment?: string`, `release?: string`, `tracesSampleRate?: number`, `sensitiveFields?: string[]`. It SHALL NOT include `replaysSessionSampleRate`, `replaysOnErrorSampleRate`, or `profileSessionSampleRate`.
3. `initializeBrowserSentry` SHALL apply `browserTracingIntegration()` only — no replay, no profiling.
4. `initializeBrowserSentry` SHALL apply the same `beforeSend` sanitization pattern as `initializeReactSentry`, reusing `sanitizeData` and `sanitizeUrl` from `src/utils/sanitizer.ts`.
5. `initializeBrowserSentry` SHALL apply the same `beforeBreadcrumb` sanitization pattern as `initializeReactSentry`.
6. `initializeBrowserSentry` SHALL call `createLogger(config.serviceName ?? 'browser')` after Sentry is initialized, so the singleton logger is ready immediately after init.
7. `@sentry/browser` SHALL be added as a regular dependency in `package.json` at the same version constraint as the existing `@sentry/react` and `@sentry/node` entries.

---

### Requirement 6: `./react` Entry Point — Logger Export

**User Story:** As a React popup developer in `govnix-mca-extension`, I want to import `createLogger` and `getLogger` from `@dotevolve/error-utils/react` alongside the existing `initializeReactSentry`, so I have one import path for all logging and Sentry setup in popup code.

#### Acceptance Criteria

1. `src/react.ts` SHALL export `createLogger` and `getLogger` from `./logger/react`.
2. THE `./react` entry point SHALL continue to export all existing exports without change: error classes, `ErrorCategory`, `initializeReactSentry`, `ReactSentryConfig`, `sanitizeData`, `sanitizeUrl`, and `Sentry` from `@sentry/react`.

---

### Requirement 7: Version Bump

**User Story:** As a consuming project developer, I want the updated package to be published at a new semver version so I can install the exact version that includes the browser entry point and logger enhancements.

#### Acceptance Criteria

1. THE version in `package.json` SHALL be bumped from `1.0.10` to `1.0.11`.
2. `npm run build` SHALL succeed with no TypeScript errors after all source changes.
3. `npm test` SHALL pass with all existing tests green and new tests added for the browser logger and `initializeBrowserSentry`.

---

### Requirement 8: Extension — `background.ts` Migration

**User Story:** As a platform engineer, I want `background.ts` in `govnix-mca-extension` to use the shared utilities from `@dotevolve/error-utils/browser`, eliminating the direct `Sentry.init` call, the duplicate `sanitizeData` function, and all `console.log` calls.

#### Acceptance Criteria

1. `background.ts` SHALL import `initializeBrowserSentry` and `createLogger` from `@dotevolve/error-utils/browser`.
2. `background.ts` SHALL replace `Sentry.init(...)` with `initializeBrowserSentry({ dsn, environment, release, tracesSampleRate })`.
3. `background.ts` SHALL remove the inline `sanitizeData` function entirely — it is superseded by the sanitization inside `initializeBrowserSentry`.
4. EVERY `console.log(...)` call in `background.ts` SHALL be replaced with `logger.info(...)` using the logger returned by `createLogger`.
5. `background.ts` SHALL NOT import `@sentry/browser` directly after this change.
6. THE extension SHALL build without TypeScript errors after this change.

---

### Requirement 9: Extension — `main.tsx` Migration

**User Story:** As a platform engineer, I want `main.tsx` in `govnix-mca-extension` to use `initializeReactSentry` from `@dotevolve/error-utils/react` and initialize the popup logger singleton, replacing the direct `Sentry.init` call.

#### Acceptance Criteria

1. `main.tsx` SHALL replace `import * as Sentry from "@sentry/react"; Sentry.init(...)` with `import { initializeReactSentry, createLogger } from "@dotevolve/error-utils/react"`.
2. `main.tsx` SHALL call `initializeReactSentry({ dsn, environment, release, tracesSampleRate, replaysSessionSampleRate, replaysOnErrorSampleRate })`.
3. `main.tsx` SHALL call `createLogger('govnix-mca-extension-popup')` to initialize the popup logger singleton.
4. `main.tsx` SHALL NOT call `Sentry.init` directly after this change.

---

### Requirement 10: Extension — `ErrorHandler` Migration

**User Story:** As a platform engineer, I want `ExtensionErrorHandler` in `src/utils/errorHandler.ts` to use `getLogger()` from `@dotevolve/error-utils/react` instead of calling `Sentry.captureException` and `Sentry.addBreadcrumb` directly, so all Sentry instrumentation flows through the shared logger.

#### Acceptance Criteria

1. `errorHandler.ts` SHALL import `getLogger` from `@dotevolve/error-utils/react` instead of `@sentry/browser`.
2. WHEN `ExtensionErrorHandler.handle(error)` processes a network error, it SHALL call `getLogger().error({ errorType: 'network_error', source: 'extension' }, error.message ?? 'Network error')` instead of calling `Sentry.captureException` directly.
3. WHEN `ExtensionErrorHandler.handle(error)` processes a non-validation backend error, it SHALL call `getLogger().error({ correlationId, category, code, status, url, method }, errorResponse.error?.message)` instead of calling `Sentry.captureException` directly.
4. WHEN `ExtensionErrorHandler.handle(error)` processes a validation backend error (`ErrorCategory.VALIDATION`), it SHALL call `getLogger().warn({ correlationId, category, code }, errorResponse.error?.message)` — which produces a Sentry breadcrumb, not an exception, matching the existing intent of skipping Sentry capture for validation errors.
5. `errorHandler.ts` SHALL NOT import `@sentry/browser` after this change.

---

### Requirement 11: Extension — Dependency

**User Story:** As an extension developer, I want `@dotevolve/error-utils` listed as a dependency in the extension's `package.json` so the package is available at build time and install time.

#### Acceptance Criteria

1. `govnix-mca-extension/package.json` SHALL add `"@dotevolve/error-utils": "^1.0.11"` to `dependencies`.
2. After `npm install`, the `@dotevolve/error-utils/browser` and `@dotevolve/error-utils/react` entry points SHALL be importable in the extension build.

---

### Requirement 12: Cross-Cutting — No Direct Sentry API Calls

**User Story:** As a platform engineer, I want zero direct `Sentry.init`, `Sentry.captureException`, or `Sentry.addBreadcrumb` calls in the extension's application code (outside of `@dotevolve/error-utils`), so all observability flows through the shared logger.

#### Acceptance Criteria

1. After the migration, `background.ts` SHALL contain zero calls to `Sentry.*` (the Sentry object SHALL not be imported).
2. After the migration, `main.tsx` SHALL contain zero calls to `Sentry.init` (it may still use `@sentry/react`'s `ErrorBoundary` component if needed).
3. After the migration, `errorHandler.ts` SHALL contain zero imports from `@sentry/browser`.
4. Content scripts (`authSync.ts`, `mcaInjector.ts`) SHALL remain completely unchanged — no Sentry, no logger, no new imports.
