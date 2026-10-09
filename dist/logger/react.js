"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.getLogger = getLogger;
const Sentry = __importStar(require("@sentry/react"));
function createBrowserLogger(serviceName, bindings = {}) {
    const buildExtra = (obj) => ({
        service: serviceName,
        ...bindings,
        ...(obj && typeof obj === "object" && !(obj instanceof Error)
            ? obj
            : {}),
    });
    return {
        debug(obj, msg) {
            const message = typeof obj === "string" ? obj : (msg ?? "");
            console.debug(`[${serviceName}]`, message, typeof obj === "object" ? obj : "");
        },
        info(obj, msg) {
            const message = typeof obj === "string" ? obj : (msg ?? "");
            console.info(`[${serviceName}]`, message);
            Sentry.addBreadcrumb({
                message,
                level: "info",
                data: buildExtra(obj),
            });
        },
        warn(obj, msg) {
            const message = typeof obj === "string" ? obj : (msg ?? "");
            console.warn(`[${serviceName}]`, message);
            Sentry.addBreadcrumb({
                message,
                level: "warning",
                data: buildExtra(obj),
            });
        },
        error(obj, msg) {
            const message = typeof obj === "string" ? obj : (msg ?? "");
            const error = obj instanceof Error ? obj : new Error(message);
            console.error(`[${serviceName}]`, message, obj);
            Sentry.captureException(error, { extra: buildExtra(obj) });
        },
        fatal(obj, msg) {
            const message = typeof obj === "string" ? obj : (msg ?? "");
            const error = obj instanceof Error ? obj : new Error(message);
            console.error(`[${serviceName}][FATAL]`, message, obj);
            Sentry.captureException(error, {
                level: "fatal",
                extra: buildExtra(obj),
            });
        },
        child(childBindings) {
            return createBrowserLogger(serviceName, {
                ...bindings,
                ...childBindings,
            });
        },
    };
}
const noopLogger = {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
    fatal: () => { },
    child: () => noopLogger,
};
let singleton = null;
function createLogger(serviceName) {
    singleton = createBrowserLogger(serviceName);
    return singleton;
}
function getLogger() {
    return singleton ?? noopLogger;
}
