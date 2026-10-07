"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogEntrySchema = exports.AuditLogger = exports.sanitizeUrl = exports.sanitizeData = exports.getLogger = exports.createLogger = exports.initializeBrowserSentry = exports.ErrorCategory = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
// Error classes
var AppError_js_1 = require("./errors/AppError.js");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return AppError_js_1.AppError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return AppError_js_1.ValidationError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return AppError_js_1.AuthenticationError; } });
Object.defineProperty(exports, "AuthorizationError", { enumerable: true, get: function () { return AppError_js_1.AuthorizationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return AppError_js_1.NotFoundError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return AppError_js_1.ConflictError; } });
var ErrorCategory_js_1 = require("./errors/ErrorCategory.js");
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return ErrorCategory_js_1.ErrorCategory; } });
// Browser Sentry initializer (uses @sentry/browser — safe for Service Workers)
var configBrowser_js_1 = require("./sentry/configBrowser.js");
Object.defineProperty(exports, "initializeBrowserSentry", { enumerable: true, get: function () { return configBrowser_js_1.initializeBrowserSentry; } });
// Browser logger (no pino — safe for all browser contexts)
var react_js_1 = require("./logger/react.js");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return react_js_1.createLogger; } });
Object.defineProperty(exports, "getLogger", { enumerable: true, get: function () { return react_js_1.getLogger; } });
// Utilities
var sanitizer_js_1 = require("./utils/sanitizer.js");
Object.defineProperty(exports, "sanitizeData", { enumerable: true, get: function () { return sanitizer_js_1.sanitizeData; } });
Object.defineProperty(exports, "sanitizeUrl", { enumerable: true, get: function () { return sanitizer_js_1.sanitizeUrl; } });
// Audit Logger
var AuditLogger_js_1 = require("./audit/AuditLogger.js");
Object.defineProperty(exports, "AuditLogger", { enumerable: true, get: function () { return AuditLogger_js_1.AuditLogger; } });
var schema_js_1 = require("./audit/schema.js");
Object.defineProperty(exports, "auditLogEntrySchema", { enumerable: true, get: function () { return schema_js_1.auditLogEntrySchema; } });
