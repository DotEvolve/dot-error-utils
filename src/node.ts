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

// Middleware
export { correlationIdMiddleware } from "./middleware/correlationId.js";
export {
  errorHandlerMiddleware,
  setupSentryErrorHandler,
} from "./middleware/errorHandler.js";
export type { ErrorResponse } from "./middleware/errorHandler.js";
export {
  setupSentryMiddleware,
  attachSentryContext,
} from "./middleware/sentryMiddleware.js";

// Sentry configuration
export { initializeSentry } from "./sentry/config.js";
export type { SentryConfig } from "./sentry/config.js";

// Database utilities
export { withTransaction } from "./db/transactionHandler.js";

// Logger
export { createLogger, getLogger } from "./logger/index.js";

// Utilities
export { asyncHandler } from "./utils/asyncHandler.js";
export { sanitizeData, sanitizeUrl } from "./utils/sanitizer.js";

export * as Sentry from "@sentry/node";
export * from "./audit/index.js";
