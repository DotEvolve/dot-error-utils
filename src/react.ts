// Error classes
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from "./errors/AppError.js";

export { ErrorCategory } from "./errors/ErrorCategory.js";
export type { ErrorCategoryType } from "./errors/ErrorCategory.js";

// React Sentry configuration
export { initializeReactSentry } from "./sentry/configReact.js";
export type { ReactSentryConfig } from "./sentry/configReact.js";

// Utilities
export { sanitizeData, sanitizeUrl } from "./utils/sanitizer.js";

// Logger (browser-safe, no pino)
export { createLogger, getLogger } from "./logger/react.js";
export type { BrowserLogger, LogMeta } from "./types/logger.js";

export * as Sentry from "@sentry/react";
