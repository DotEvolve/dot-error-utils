import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for the browser logger (src/logger/react.ts).
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * Each test re-imports the module after resetting it so the singleton is
 * always in a clean state and the @sentry/react mock is freshly applied.
 */

// ---------------------------------------------------------------------------
// Types only — imported at the top level (no singleton state here)
// ---------------------------------------------------------------------------
import type { BrowserLogger } from "../types/logger";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Re-import the logger module with a fresh singleton after resetting modules. */
async function freshModule() {
  vi.resetModules();

  // Re-apply the mock AFTER resetting so the new module instance picks it up.
  vi.mock("@sentry/react", () => ({
    addBreadcrumb: vi.fn(),
    captureException: vi.fn(),
  }));

  const loggerModule = await import("../logger/react");
  const sentryModule = await import("@sentry/react");

  return {
    createLogger: loggerModule.createLogger,
    getLogger: loggerModule.getLogger,
    addBreadcrumb: sentryModule.addBreadcrumb as ReturnType<typeof vi.fn>,
    captureException: sentryModule.captureException as ReturnType<typeof vi.fn>,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLogger — before createLogger is called", () => {
  it("returns a noop logger whose methods are all silent no-ops", async () => {
    const { getLogger, addBreadcrumb, captureException } = await freshModule();

    const logger = getLogger();

    // All methods exist
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.fatal).toBe("function");
    expect(typeof logger.child).toBe("function");

    // Calling them does NOT throw and does NOT reach Sentry
    expect(() => logger.debug("msg")).not.toThrow();
    expect(() => logger.info("msg")).not.toThrow();
    expect(() => logger.warn("msg")).not.toThrow();
    expect(() => logger.error("msg")).not.toThrow();
    expect(() => logger.fatal("msg")).not.toThrow();

    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("noop child() returns the same noop and does not call Sentry", async () => {
    const { getLogger, addBreadcrumb, captureException } = await freshModule();

    const noop = getLogger();
    const child = noop.child({ requestId: "x" });

    expect(() => child.error("some error")).not.toThrow();
    expect(captureException).not.toHaveBeenCalled();
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });
});

describe("getLogger — after createLogger is called", () => {
  it("returns the singleton created by createLogger", async () => {
    const { createLogger, getLogger } = await freshModule();

    const created = createLogger("test-service");
    const retrieved = getLogger();

    expect(retrieved).toBe(created);
  });

  it("returns the most recently created singleton", async () => {
    const { createLogger, getLogger } = await freshModule();

    createLogger("service-a");
    const second = createLogger("service-b");

    expect(getLogger()).toBe(second);
  });
});

describe("logger.debug", () => {
  it("calls console.debug and does NOT call any Sentry API", async () => {
    const { createLogger, addBreadcrumb, captureException } =
      await freshModule();

    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const logger = createLogger("debug-svc");
    logger.debug("a debug message");

    expect(consoleSpy).toHaveBeenCalled();
    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("calls console.debug with obj+msg overload and still skips Sentry", async () => {
    const { createLogger, addBreadcrumb, captureException } =
      await freshModule();

    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const logger = createLogger("debug-svc");
    logger.debug({ requestId: "r1" }, "a debug message");

    expect(consoleSpy).toHaveBeenCalled();
    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("logger.info", () => {
  it("calls Sentry.addBreadcrumb with level: 'info'", async () => {
    const { createLogger, addBreadcrumb } = await freshModule();

    vi.spyOn(console, "info").mockImplementation(() => {});

    const logger = createLogger("info-svc");
    logger.info("user logged in");

    expect(addBreadcrumb).toHaveBeenCalledOnce();
    const call = addBreadcrumb.mock.calls[0][0];
    expect(call.level).toBe("info");
    expect(call.message).toBe("user logged in");
  });

  it("does NOT call captureException", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "info").mockImplementation(() => {});

    const logger = createLogger("info-svc");
    logger.info("some info");

    expect(captureException).not.toHaveBeenCalled();
  });
});

describe("logger.warn", () => {
  it("calls Sentry.addBreadcrumb with level: 'warning'", async () => {
    const { createLogger, addBreadcrumb } = await freshModule();

    vi.spyOn(console, "warn").mockImplementation(() => {});

    const logger = createLogger("warn-svc");
    logger.warn("low disk space");

    expect(addBreadcrumb).toHaveBeenCalledOnce();
    const call = addBreadcrumb.mock.calls[0][0];
    expect(call.level).toBe("warning");
    expect(call.message).toBe("low disk space");
  });

  it("does NOT call captureException", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "warn").mockImplementation(() => {});

    const logger = createLogger("warn-svc");
    logger.warn("something suspicious");

    expect(captureException).not.toHaveBeenCalled();
  });
});

describe("logger.error", () => {
  it("error(msg) wraps the string in a new Error and passes it to captureException", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "error").mockImplementation(() => {});

    const logger = createLogger("error-svc");
    logger.error("something broke");

    expect(captureException).toHaveBeenCalledOnce();
    const [err] = captureException.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("something broke");
  });

  it("error(errorInstance, msg) passes the original Error instance directly", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "error").mockImplementation(() => {});

    const original = new Error("original error");
    const logger = createLogger("error-svc");
    logger.error(original, "additional context");

    expect(captureException).toHaveBeenCalledOnce();
    const [err] = captureException.mock.calls[0];
    expect(err).toBe(original); // same reference — not a wrapped copy
  });

  it("error(meta, msg) wraps msg in a new Error when first arg is LogMeta", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "error").mockImplementation(() => {});

    const logger = createLogger("error-svc");
    logger.error({ correlationId: "abc" }, "request failed");

    expect(captureException).toHaveBeenCalledOnce();
    const [err] = captureException.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("request failed");
  });

  it("does NOT call addBreadcrumb", async () => {
    const { createLogger, addBreadcrumb } = await freshModule();

    vi.spyOn(console, "error").mockImplementation(() => {});

    const logger = createLogger("error-svc");
    logger.error("boom");

    expect(addBreadcrumb).not.toHaveBeenCalled();
  });
});

describe("logger.fatal", () => {
  it("fatal(msg) calls captureException with level: 'fatal'", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "error").mockImplementation(() => {});

    const logger = createLogger("fatal-svc");
    logger.fatal("system unrecoverable");

    expect(captureException).toHaveBeenCalledOnce();
    const [err, opts] = captureException.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("system unrecoverable");
    expect(opts?.level).toBe("fatal");
  });

  it("fatal(errorInstance, msg) passes the original Error with level: 'fatal'", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "error").mockImplementation(() => {});

    const original = new Error("catastrophic failure");
    const logger = createLogger("fatal-svc");
    logger.fatal(original, "fatal context");

    expect(captureException).toHaveBeenCalledOnce();
    const [err, opts] = captureException.mock.calls[0];
    expect(err).toBe(original);
    expect(opts?.level).toBe("fatal");
  });
});

describe("logger.child — binding inheritance", () => {
  it("child logger's Sentry context includes parent bindings", async () => {
    const { createLogger, addBreadcrumb } = await freshModule();

    vi.spyOn(console, "info").mockImplementation(() => {});

    const parent = createLogger("binding-svc");
    // Give the parent some bindings via child (parent itself has none beyond serviceName)
    const child = parent.child({ requestId: "req-1", userId: "usr-42" });

    child.info("child message");

    expect(addBreadcrumb).toHaveBeenCalledOnce();
    const call = addBreadcrumb.mock.calls[0][0];
    expect(call.message).toBe("child message");
    expect(call.data?.requestId).toBe("req-1");
    expect(call.data?.userId).toBe("usr-42");
  });

  it("grandchild logger merges parent + child bindings", async () => {
    const { createLogger, addBreadcrumb } = await freshModule();

    vi.spyOn(console, "info").mockImplementation(() => {});

    const parent = createLogger("binding-svc");
    const child = parent.child({ requestId: "req-1" });
    const grandchild = child.child({ traceId: "trace-99" });

    grandchild.info("deep message");

    expect(addBreadcrumb).toHaveBeenCalledOnce();
    const call = addBreadcrumb.mock.calls[0][0];
    expect(call.data?.requestId).toBe("req-1");
    expect(call.data?.traceId).toBe("trace-99");
  });

  it("child logger extra context includes parent bindings in error calls", async () => {
    const { createLogger, captureException } = await freshModule();

    vi.spyOn(console, "error").mockImplementation(() => {});

    const parent = createLogger("error-binding-svc");
    const child = parent.child({ correlationId: "corr-abc" });

    child.error("child error");

    expect(captureException).toHaveBeenCalledOnce();
    const [, opts] = captureException.mock.calls[0];
    expect(opts?.extra?.correlationId).toBe("corr-abc");
  });
});
