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

// Middleware
export { correlationIdMiddleware } from "./middleware/correlationId";
export {
  errorHandlerMiddleware,
  setupSentryErrorHandler,
} from "./middleware/errorHandler";
export type { ErrorResponse } from "./middleware/errorHandler";
export {
  setupSentryMiddleware,
  attachSentryContext,
} from "./middleware/sentryMiddleware";

// Sentry configuration
export { initializeSentry } from "./sentry/config";
export type { SentryConfig } from "./sentry/config";

// Database utilities
export { withTransaction } from "./db/transactionHandler";

// Utilities
export { asyncHandler } from "./utils/asyncHandler";
export { sanitizeData, sanitizeUrl } from "./utils/sanitizer";

export * as Sentry from "@sentry/node";
