import { ErrorCategoryType } from './ErrorCategory';
/**
 * Base application error class with Sentry integration support
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly category: ErrorCategoryType;
    readonly details: any;
    readonly isOperational: boolean;
    constructor(message: string, statusCode: number, category: ErrorCategoryType, details?: any);
    /**
     * Serialize error details for Sentry context
     */
    toSentryContext(): Record<string, any>;
}
/**
 * Validation error (400)
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, string[]>);
}
/**
 * Authentication error (401)
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
/**
 * Authorization error (403)
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Not found error (404)
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string);
}
/**
 * Conflict error (409)
 */
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
