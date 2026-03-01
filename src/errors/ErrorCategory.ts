/**
 * Standard error categories for consistent error classification across services
 */
export const ErrorCategory = {
  VALIDATION: "validation",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  CONFLICT: "conflict",
  NOT_FOUND: "not_found",
  SYSTEM: "system",
} as const;

export type ErrorCategoryType =
  (typeof ErrorCategory)[keyof typeof ErrorCategory];
