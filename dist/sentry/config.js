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
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSentry = initializeSentry;
const Sentry = __importStar(require("@sentry/node"));
const sanitizer_1 = require("../utils/sanitizer");
const logger_1 = require("../logger");
/**
 * Initialize Sentry for a Node.js / Express service.
 *
 * Configures the Sentry SDK with the provided options, applies sensible
 * defaults for `tracesSampleRate` and `profilesSampleRate` based on the
 * environment, sanitizes outgoing event data, and initialises the structured
 * logger singleton for the service.
 *
 * Call this once at application startup, before any routes are registered.
 *
 * @param config - Sentry configuration options
 * @param config.dsn - Sentry DSN for the project
 * @param config.serviceName - Identifies the service in Sentry and log output
 * @param config.environment - Deployment environment (defaults to `NODE_ENV`)
 * @param config.release - Release identifier (e.g. git SHA)
 * @param config.tracesSampleRate - Fraction of transactions to sample (0–1)
 * @param config.profilesSampleRate - Fraction of profiles to sample (0–1)
 * @param config.sensitiveFields - Additional field names to redact from events
 * @returns The configured `@sentry/node` module
 *
 * @throws Does not throw; Sentry SDK errors are swallowed internally
 *
 * @example
 * ```ts
 * import { initializeSentry } from '@dotevolve/error-utils/node';
 *
 * initializeSentry({
 *   dsn: process.env.SENTRY_DSN!,
 *   serviceName: 'my-api',
 *   environment: process.env.NODE_ENV,
 * });
 * ```
 */
function initializeSentry(config) {
  /**
   * Initialize Sentry
   *
   * @param {SentryConfig} config - Configuration options
   * @returns {any} The any
   */
  /**
   * Initialize Sentry
   *
   * @param {SentryConfig} config - Configuration options
   * @returns {any} The any
   */
  /**
   * Initialize Sentry
   *
   * @param {SentryConfig} config - Configuration options
   * @returns {any} The any
   */
  const {
    dsn,
    environment = process.env.NODE_ENV || "development",
    serviceName,
    release,
    tracesSampleRate = environment === "production" ? 0.1 : 1.0,
    profilesSampleRate = environment === "production" ? 0.1 : 1.0,
    sensitiveFields = [],
  } = config;
  let profilingIntegration = null;
  try {
    profilingIntegration =
      require("@sentry/profiling-node").nodeProfilingIntegration;
  } catch {
    // Profiling not available (native bindings missing) — disabled gracefully
  }
  Sentry.init({
    dsn,
    environment,
    serverName: serviceName,
    release,
    debug: true, // Enable Sentry logs for debugging
    enableLogs: true,
    // Performance monitoring
    tracesSampleRate,
    profilesSampleRate,
    // Integrations
    integrations: [...(profilingIntegration ? [profilingIntegration()] : [])],
    // Data sanitization
    beforeSend(event, hint) {
      // Sanitize request data
      if (event.request?.data) {
        event.request.data = (0, sanitizer_1.sanitizeData)(
          event.request.data,
          sensitiveFields,
        );
      }
      // Sanitize extra context
      if (event.extra) {
        event.extra = (0, sanitizer_1.sanitizeData)(
          event.extra,
          sensitiveFields,
        );
      }
      return event;
    },
    // Breadcrumb filtering and sanitization
    beforeBreadcrumb(breadcrumb, hint) {
      if (breadcrumb.category === "http" && breadcrumb.data?.url) {
        breadcrumb.data.url = (0, sanitizer_1.sanitizeUrl)(breadcrumb.data.url);
      }
      // Sanitize breadcrumb data
      if (breadcrumb.data) {
        breadcrumb.data = (0, sanitizer_1.sanitizeData)(
          breadcrumb.data,
          sensitiveFields,
        );
      }
      return breadcrumb;
    },
    // Error filtering
    ignoreErrors: [
      // Ignore known non-critical errors
      "ECONNRESET",
      "EPIPE",
      "ECONNREFUSED",
    ],
  });
  // Initialise the logger singleton for this service
  (0, logger_1.createLogger)(serviceName);
  return Sentry;
}
