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

// Browser Sentry initializer (uses @sentry/browser — safe for Service Workers)
export { initializeBrowserSentry } from "./sentry/configBrowser.js";
export type { BrowserSentryConfig } from "./sentry/configBrowser.js";

// Browser logger (no pino — safe for all browser contexts)
export { createLogger, getLogger } from "./logger/react.js";
export type { BrowserLogger, LogMeta } from "./types/logger.js";

// Utilities
export { sanitizeData, sanitizeUrl } from "./utils/sanitizer.js";

// Audit Logger
export { AuditLogger } from "./audit/AuditLogger.js";
export type {
  AuditLogEntry,
  AuditTransport,
  AuditLoggerConfig,
} from "./audit/types.js";
export { auditLogEntrySchema } from "./audit/schema.js";
