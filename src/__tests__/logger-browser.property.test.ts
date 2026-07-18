import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock @sentry/react before importing the logger
vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Import Sentry mock and logger after vi.mock is hoisted
import * as Sentry from "@sentry/react";
import { createLogger, getLogger } from "../logger/react";

const mockCaptureException = vi.mocked(Sentry.captureException);
const mockAddBreadcrumb = vi.mocked(Sentry.addBreadcrumb);

/**
 * Arbitrary for LogMeta: record with string keys and primitive values.
 * We constrain keys to ASCII printable strings to avoid edge cases with
 * property keys that could collide with prototype fields.
 */
const logMetaArb = fc.dictionary(
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
);

/** Non-empty string message arbitrary */
const msgArb = fc.string({ minLength: 1, maxLength: 200 });

/** Service name arbitrary */
const serviceNameArb = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9-_]*$/)
  .filter((s) => s.length > 0 && s.length <= 40);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset singleton between tests so each property run starts fresh
  // createLogger() always sets a new singleton
});

// ---------------------------------------------------------------------------
// Property 1: Error/fatal log levels always produce Sentry exceptions
// Validates: Requirements 1.2, 3.3
// ---------------------------------------------------------------------------
describe("Property 1: Error/fatal log levels always produce Sentry exceptions", () => {
  it("logger.error(meta, msg) always calls captureException with an Error", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        logMetaArb,
        msgArb,
        (serviceName, meta, msg) => {
          vi.clearAllMocks();
          const logger = createLogger(serviceName);

          logger.error(meta, msg);

          expect(mockCaptureException).toHaveBeenCalledTimes(1);
          const capturedArg = mockCaptureException.mock.calls[0][0];
          expect(capturedArg).toBeInstanceOf(Error);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("logger.fatal(meta, msg) always calls captureException with an Error", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        logMetaArb,
        msgArb,
        (serviceName, meta, msg) => {
          vi.clearAllMocks();
          const logger = createLogger(serviceName);

          logger.fatal(meta, msg);

          expect(mockCaptureException).toHaveBeenCalledTimes(1);
          const capturedArg = mockCaptureException.mock.calls[0][0];
          expect(capturedArg).toBeInstanceOf(Error);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Info/warn log levels always produce Sentry breadcrumbs
// Validates: Requirements 1.3, 3.4
// ---------------------------------------------------------------------------
describe("Property 2: Info/warn log levels always produce Sentry breadcrumbs", () => {
  it("logger.info(meta, msg) always calls addBreadcrumb with level 'info'", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        logMetaArb,
        msgArb,
        (serviceName, meta, msg) => {
          vi.clearAllMocks();
          const logger = createLogger(serviceName);

          logger.info(meta, msg);

          expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
          const breadcrumb = mockAddBreadcrumb.mock.calls[0][0];
          expect(breadcrumb.level).toBe("info");
          expect(mockCaptureException).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("logger.warn(meta, msg) always calls addBreadcrumb with level 'warning'", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        logMetaArb,
        msgArb,
        (serviceName, meta, msg) => {
          vi.clearAllMocks();
          const logger = createLogger(serviceName);

          logger.warn(meta, msg);

          expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
          const breadcrumb = mockAddBreadcrumb.mock.calls[0][0];
          expect(breadcrumb.level).toBe("warning");
          expect(mockCaptureException).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Debug log level never touches Sentry
// Validates: Requirements 1.4, 3.5
// ---------------------------------------------------------------------------
describe("Property 3: Debug log level never touches Sentry", () => {
  it("logger.debug(meta, msg) never calls captureException or addBreadcrumb", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        logMetaArb,
        msgArb,
        (serviceName, meta, msg) => {
          vi.clearAllMocks();
          const logger = createLogger(serviceName);

          logger.debug(meta, msg);

          expect(mockCaptureException).not.toHaveBeenCalled();
          expect(mockAddBreadcrumb).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("logger.debug(msg) never calls captureException or addBreadcrumb", () => {
    fc.assert(
      fc.property(serviceNameArb, msgArb, (serviceName, msg) => {
        vi.clearAllMocks();
        const logger = createLogger(serviceName);

        logger.debug(msg);

        expect(mockCaptureException).not.toHaveBeenCalled();
        expect(mockAddBreadcrumb).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Error instance pass-through
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------
describe("Property 4: Error instance pass-through", () => {
  it("logger.error(errorInstance, msg) passes the same Error instance to captureException", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        msgArb,
        msgArb,
        (serviceName, errorMsg, logMsg) => {
          vi.clearAllMocks();
          const logger = createLogger(serviceName);
          const originalError = new Error(errorMsg);

          logger.error(originalError, logMsg);

          expect(mockCaptureException).toHaveBeenCalledTimes(1);
          const capturedArg = mockCaptureException.mock.calls[0][0];
          // Must be the exact same instance — not a new wrapping Error
          expect(capturedArg).toBe(originalError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("logger.fatal(errorInstance, msg) passes the same Error instance to captureException", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        msgArb,
        msgArb,
        (serviceName, errorMsg, logMsg) => {
          vi.clearAllMocks();
          const logger = createLogger(serviceName);
          const originalError = new Error(errorMsg);

          logger.fatal(originalError, logMsg);

          expect(mockCaptureException).toHaveBeenCalledTimes(1);
          const capturedArg = mockCaptureException.mock.calls[0][0];
          expect(capturedArg).toBe(originalError);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: String-only call wraps in Error
// Validates: Requirements 2.3
// ---------------------------------------------------------------------------
describe("Property 5: String-only call wraps in Error", () => {
  it("logger.error(msg) calls captureException with new Error(msg)", () => {
    fc.assert(
      fc.property(serviceNameArb, msgArb, (serviceName, msg) => {
        vi.clearAllMocks();
        const logger = createLogger(serviceName);

        logger.error(msg);

        expect(mockCaptureException).toHaveBeenCalledTimes(1);
        const capturedArg = mockCaptureException.mock.calls[0][0];
        expect(capturedArg).toBeInstanceOf(Error);
        expect((capturedArg as Error).message).toBe(msg);
      }),
      { numRuns: 100 },
    );
  });

  it("logger.fatal(msg) calls captureException with new Error(msg)", () => {
    fc.assert(
      fc.property(serviceNameArb, msgArb, (serviceName, msg) => {
        vi.clearAllMocks();
        const logger = createLogger(serviceName);

        logger.fatal(msg);

        expect(mockCaptureException).toHaveBeenCalledTimes(1);
        const capturedArg = mockCaptureException.mock.calls[0][0];
        expect(capturedArg).toBeInstanceOf(Error);
        expect((capturedArg as Error).message).toBe(msg);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Child logger inherits bindings
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------
describe("Property 6: Child logger inherits bindings", () => {
  it("child logger error calls include both parent and child bindings in extra", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        logMetaArb,
        logMetaArb,
        msgArb,
        (serviceName, parentBindings, childBindings, msg) => {
          vi.clearAllMocks();
          const parent = createLogger(serviceName);
          const child = parent.child(parentBindings).child(childBindings);

          child.error(msg);

          expect(mockCaptureException).toHaveBeenCalledTimes(1);
          const callArgs = mockCaptureException.mock.calls[0];
          // Second argument is the options object with extra
          const options = callArgs[1] as { extra?: Record<string, unknown> };
          expect(options).toBeDefined();
          expect(options.extra).toBeDefined();

          const extra = options.extra as Record<string, unknown>;

          // All parent bindings must appear in extra (unless overridden by child)
          for (const [key, value] of Object.entries(parentBindings)) {
            if (!(key in childBindings)) {
              expect(extra[key]).toEqual(value);
            }
          }

          // All child bindings must appear in extra
          for (const [key, value] of Object.entries(childBindings)) {
            expect(extra[key]).toEqual(value);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("child logger info calls include both parent and child bindings in breadcrumb data", () => {
    fc.assert(
      fc.property(
        serviceNameArb,
        logMetaArb,
        logMetaArb,
        msgArb,
        (serviceName, parentBindings, childBindings, msg) => {
          vi.clearAllMocks();
          const parent = createLogger(serviceName);
          const child = parent.child(parentBindings).child(childBindings);

          child.info(msg);

          expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
          const breadcrumb = mockAddBreadcrumb.mock.calls[0][0];
          const data = breadcrumb.data as Record<string, unknown> | undefined;
          expect(data).toBeDefined();

          // All parent bindings must appear in breadcrumb data (unless overridden by child)
          for (const [key, value] of Object.entries(parentBindings)) {
            if (!(key in childBindings)) {
              expect(data![key]).toEqual(value);
            }
          }

          // All child bindings must appear in breadcrumb data
          for (const [key, value] of Object.entries(childBindings)) {
            expect(data![key]).toEqual(value);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
