"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUrl =
  exports.sanitizeData =
  exports.asyncHandler =
  exports.withTransaction =
  exports.initializeSentry =
  exports.attachSentryContext =
  exports.setupSentryMiddleware =
  exports.setupSentryErrorHandler =
  exports.errorHandlerMiddleware =
  exports.correlationIdMiddleware =
  exports.ErrorCategory =
  exports.ConflictError =
  exports.NotFoundError =
  exports.AuthorizationError =
  exports.AuthenticationError =
  exports.ValidationError =
  exports.AppError =
    void 0;
var AppError_js_1 = require("./errors/AppError.js");
Object.defineProperty(exports, "AppError", {
  enumerable: true,
  get: function () {
    return AppError_js_1.AppError;
  },
});
Object.defineProperty(exports, "ValidationError", {
  enumerable: true,
  get: function () {
    return AppError_js_1.ValidationError;
  },
});
Object.defineProperty(exports, "AuthenticationError", {
  enumerable: true,
  get: function () {
    return AppError_js_1.AuthenticationError;
  },
});
Object.defineProperty(exports, "AuthorizationError", {
  enumerable: true,
  get: function () {
    return AppError_js_1.AuthorizationError;
  },
});
Object.defineProperty(exports, "NotFoundError", {
  enumerable: true,
  get: function () {
    return AppError_js_1.NotFoundError;
  },
});
Object.defineProperty(exports, "ConflictError", {
  enumerable: true,
  get: function () {
    return AppError_js_1.ConflictError;
  },
});
var ErrorCategory_js_1 = require("./errors/ErrorCategory.js");
Object.defineProperty(exports, "ErrorCategory", {
  enumerable: true,
  get: function () {
    return ErrorCategory_js_1.ErrorCategory;
  },
});
var correlationId_js_1 = require("./middleware/correlationId.js");
Object.defineProperty(exports, "correlationIdMiddleware", {
  enumerable: true,
  get: function () {
    return correlationId_js_1.correlationIdMiddleware;
  },
});
var errorHandler_js_1 = require("./middleware/errorHandler.js");
Object.defineProperty(exports, "errorHandlerMiddleware", {
  enumerable: true,
  get: function () {
    return errorHandler_js_1.errorHandlerMiddleware;
  },
});
Object.defineProperty(exports, "setupSentryErrorHandler", {
  enumerable: true,
  get: function () {
    return errorHandler_js_1.setupSentryErrorHandler;
  },
});
var sentryMiddleware_js_1 = require("./middleware/sentryMiddleware.js");
Object.defineProperty(exports, "setupSentryMiddleware", {
  enumerable: true,
  get: function () {
    return sentryMiddleware_js_1.setupSentryMiddleware;
  },
});
Object.defineProperty(exports, "attachSentryContext", {
  enumerable: true,
  get: function () {
    return sentryMiddleware_js_1.attachSentryContext;
  },
});
var config_js_1 = require("./sentry/config.js");
Object.defineProperty(exports, "initializeSentry", {
  enumerable: true,
  get: function () {
    return config_js_1.initializeSentry;
  },
});
var transactionHandler_js_1 = require("./db/transactionHandler.js");
Object.defineProperty(exports, "withTransaction", {
  enumerable: true,
  get: function () {
    return transactionHandler_js_1.withTransaction;
  },
});
var asyncHandler_js_1 = require("./utils/asyncHandler.js");
Object.defineProperty(exports, "asyncHandler", {
  enumerable: true,
  get: function () {
    return asyncHandler_js_1.asyncHandler;
  },
});
var sanitizer_js_1 = require("./utils/sanitizer.js");
Object.defineProperty(exports, "sanitizeData", {
  enumerable: true,
  get: function () {
    return sanitizer_js_1.sanitizeData;
  },
});
Object.defineProperty(exports, "sanitizeUrl", {
  enumerable: true,
  get: function () {
    return sanitizer_js_1.sanitizeUrl;
  },
});
__exportStar(require("./audit/index.js"), exports);
