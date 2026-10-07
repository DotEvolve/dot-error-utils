/**
 * Standard error categories for consistent error classification across services
 */
export declare const ErrorCategory: Readonly<{
  readonly VALIDATION: "validation";
  readonly AUTHENTICATION: "authentication";
  readonly AUTHORIZATION: "authorization";
  readonly CONFLICT: "conflict";
  readonly NOT_FOUND: "not_found";
  readonly SYSTEM: "system";
}>;
export type ErrorCategoryType =
  (typeof ErrorCategory)[keyof typeof ErrorCategory];
