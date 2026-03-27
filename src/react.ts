// Error classes
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from "./errors/AppError";

export { ErrorCategory } from "./errors/ErrorCategory";
export type { ErrorCategoryType } from "./errors/ErrorCategory";

// React Sentry configuration
export { initializeReactSentry } from "./sentry/configReact";
export type { ReactSentryConfig } from "./sentry/configReact";

// Utilities
export { sanitizeData, sanitizeUrl } from "./utils/sanitizer";

export * as Sentry from "@sentry/react";
