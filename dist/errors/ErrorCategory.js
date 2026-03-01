"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCategory = void 0;
/**
 * Standard error categories for consistent error classification across services
 */
exports.ErrorCategory = {
    VALIDATION: "validation",
    AUTHENTICATION: "authentication",
    AUTHORIZATION: "authorization",
    CONFLICT: "conflict",
    NOT_FOUND: "not_found",
    SYSTEM: "system",
};
