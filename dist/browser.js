"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogEntrySchema = exports.AuditLogger = exports.sanitizeUrl = exports.sanitizeData = exports.getLogger = exports.createLogger = exports.initializeBrowserSentry = exports.ErrorCategory = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
// Error classes
var AppError_1 = require("./errors/AppError");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return AppError_1.AppError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return AppError_1.ValidationError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return AppError_1.AuthenticationError; } });
Object.defineProperty(exports, "AuthorizationError", { enumerable: true, get: function () { return AppError_1.AuthorizationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return AppError_1.NotFoundError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return AppError_1.ConflictError; } });
var ErrorCategory_1 = require("./errors/ErrorCategory");
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return ErrorCategory_1.ErrorCategory; } });
// Browser Sentry initializer (uses @sentry/browser — safe for Service Workers)
var configBrowser_1 = require("./sentry/configBrowser");
Object.defineProperty(exports, "initializeBrowserSentry", { enumerable: true, get: function () { return configBrowser_1.initializeBrowserSentry; } });
// Browser logger (no pino — safe for all browser contexts)
var react_1 = require("./logger/react");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return react_1.createLogger; } });
Object.defineProperty(exports, "getLogger", { enumerable: true, get: function () { return react_1.getLogger; } });
// Utilities
var sanitizer_1 = require("./utils/sanitizer");
Object.defineProperty(exports, "sanitizeData", { enumerable: true, get: function () { return sanitizer_1.sanitizeData; } });
Object.defineProperty(exports, "sanitizeUrl", { enumerable: true, get: function () { return sanitizer_1.sanitizeUrl; } });
// Audit Logger
var AuditLogger_1 = require("./audit/AuditLogger");
Object.defineProperty(exports, "AuditLogger", { enumerable: true, get: function () { return AuditLogger_1.AuditLogger; } });
var schema_1 = require("./audit/schema");
Object.defineProperty(exports, "auditLogEntrySchema", { enumerable: true, get: function () { return schema_1.auditLogEntrySchema; } });
