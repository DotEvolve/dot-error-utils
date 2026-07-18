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

// Browser Sentry initializer (uses @sentry/browser — safe for Service Workers)
export { initializeBrowserSentry } from "./sentry/configBrowser";
export type { BrowserSentryConfig } from "./sentry/configBrowser";

// Browser logger (no pino — safe for all browser contexts)
export { createLogger, getLogger } from "./logger/react";
export type { BrowserLogger, LogMeta } from "./types/logger";

// Utilities
export { sanitizeData, sanitizeUrl } from "./utils/sanitizer";

// Audit Logger
export { AuditLogger } from "./audit/AuditLogger";
export type { AuditLogEntry, AuditTransport, AuditLoggerConfig } from "./audit/types";
export { auditLogEntrySchema } from "./audit/schema";
