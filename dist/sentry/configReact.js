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
exports.initializeReactSentry = initializeReactSentry;
const Sentry = __importStar(require("@sentry/react"));
const sanitizer_1 = require("../utils/sanitizer");
/**
 * Initialize Sentry for a React frontend application.
 *
 * Configures the `@sentry/react` SDK with browser tracing and session replay
 * integrations, applies data sanitization hooks, and returns the configured
 * Sentry module.
 *
 * Call this once at the application entry point before rendering.
 *
 * @param config - React Sentry configuration options
 * @param config.dsn - Sentry DSN for the project
 * @param config.environment - Deployment environment (defaults to `"development"`)
 * @param config.release - Release identifier (e.g. git SHA)
 * @param config.tracesSampleRate - Fraction of transactions to sample (0–1)
 * @param config.replaysSessionSampleRate - Fraction of sessions to replay (0–1)
 * @param config.replaysOnErrorSampleRate - Fraction of error sessions to replay (0–1)
 * @param config.profileSessionSampleRate - Fraction of sessions to profile (0–1)
 * @param config.enableLogs - Set to true to send console logs to Sentry
 * @param config.sensitiveFields - Additional field names to redact from events
 * @param config.debug - Enable Sentry debug logging (default: `false`)
 * @returns The configured `@sentry/react` module
 *
 * @throws Does not throw; Sentry SDK errors are swallowed internally
 *
 * @example
 * ```ts
 * import { initializeReactSentry } from '@dotevolve/error-utils/react';
 *
 * initializeReactSentry({
 *   dsn: import.meta.env.VITE_SENTRY_DSN,
 *   environment: import.meta.env.MODE,
 * });
 * ```
 */
function initializeReactSentry(
  /**
   * Initialize React Sentry
   *
   * @param {ReactSentryConfig} config - Configuration options
   * @returns {any} The any
   */
  config,
) {
  const {
    dsn,
    environment = "development",
    release,
    tracesSampleRate = environment === "production" ? 1.0 : 1.0,
    replaysSessionSampleRate = environment === "production" ? 0.1 : 0,
    replaysOnErrorSampleRate = environment === "production" ? 1.0 : 1.0,
    profileSessionSampleRate = environment === "production" ? 1.0 : 1.0,
    enableLogs = false,
    sensitiveFields = [],
    debug = false,
  } = config;
  const integrations = [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ];
  if (enableLogs) {
    integrations.push(
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    );
  }
  Sentry.init({
    dsn,
    environment,
    release,
    debug,
    integrations,
    tracesSampleRate,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    profileSessionSampleRate,
    // Data sanitization
    beforeSend(event, hint) {
      if (event.request?.data) {
        event.request.data = (0, sanitizer_1.sanitizeData)(
          event.request.data,
          sensitiveFields,
        );
      }
      if (event.extra) {
        event.extra = (0, sanitizer_1.sanitizeData)(
          event.extra,
          sensitiveFields,
        );
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb, hint) {
      if (breadcrumb.category === "http" && breadcrumb.data?.url) {
        breadcrumb.data.url = (0, sanitizer_1.sanitizeUrl)(breadcrumb.data.url);
      }
      if (breadcrumb.data) {
        breadcrumb.data = (0, sanitizer_1.sanitizeData)(
          breadcrumb.data,
          sensitiveFields,
        );
      }
      return breadcrumb;
    },
  });
  return Sentry;
}
