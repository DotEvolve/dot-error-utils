import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for initializeBrowserSentry (src/sentry/configBrowser.ts).
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 *
 * Each test re-imports the module after resetting it so the @sentry/browser
 * mock is freshly applied and the createLogger singleton is in a clean state.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Re-import configBrowser with fresh module state after resetting. */
async function freshModule() {
  // Reset module registry so each test gets a fresh module instance
  vi.resetModules();

  // Re-apply mocks AFTER resetting so new module instances pick them up.
  vi.mock("@sentry/browser", () => ({
    init: vi.fn(),
    browserTracingIntegration: vi.fn(() => ({ name: "BrowserTracing" })),
  }));

  vi.mock("../logger/react", () => ({
    createLogger: vi.fn(),
  }));

  const configBrowserModule = await import("../sentry/configBrowser");
  const sentryModule = await import("@sentry/browser");
  const loggerModule = await import("../logger/react");

  const sentryInit = sentryModule.init as ReturnType<typeof vi.fn>;
  const browserTracingIntegration =
    sentryModule.browserTracingIntegration as ReturnType<typeof vi.fn>;
  const createLogger = loggerModule.createLogger as ReturnType<typeof vi.fn>;

  // Clear only these specific mocks — do not call vi.clearAllMocks() to
  // avoid polluting mocks owned by other test files running in the same worker.
  sentryInit.mockClear();
  browserTracingIntegration.mockClear();
  createLogger.mockClear();

  return {
    initializeBrowserSentry: configBrowserModule.initializeBrowserSentry,
    sentryInit,
    browserTracingIntegration,
    createLogger,
    Sentry: sentryModule,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("initializeBrowserSentry — Sentry.init call", () => {
  it("calls Sentry.init with the provided DSN", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    expect(sentryInit).toHaveBeenCalledOnce();
    const initArgs = sentryInit.mock.calls[0][0];
    expect(initArgs.dsn).toBe("https://abc@sentry.io/123");
  });

  it("calls Sentry.init with the provided environment", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({
      dsn: "https://abc@sentry.io/123",
      environment: "staging",
    });

    const initArgs = sentryInit.mock.calls[0][0];
    expect(initArgs.environment).toBe("staging");
  });

  it("uses 'production' as default environment when not provided", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    const initArgs = sentryInit.mock.calls[0][0];
    expect(initArgs.environment).toBe("production");
  });

  it("passes release to Sentry.init when provided", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({
      dsn: "https://abc@sentry.io/123",
      release: "v1.2.3",
    });

    const initArgs = sentryInit.mock.calls[0][0];
    expect(initArgs.release).toBe("v1.2.3");
  });

  it("passes tracesSampleRate to Sentry.init", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({
      dsn: "https://abc@sentry.io/123",
      tracesSampleRate: 0.5,
    });

    const initArgs = sentryInit.mock.calls[0][0];
    expect(initArgs.tracesSampleRate).toBe(0.5);
  });
});

describe("initializeBrowserSentry — integrations", () => {
  it("applies browserTracingIntegration only (no replay, no profiling)", async () => {
    const { initializeBrowserSentry, sentryInit, browserTracingIntegration } =
      await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    // browserTracingIntegration must have been called to build the integration
    expect(browserTracingIntegration).toHaveBeenCalledOnce();

    const initArgs = sentryInit.mock.calls[0][0];
    expect(initArgs.integrations).toHaveLength(1);

    // The single integration is the result returned by browserTracingIntegration()
    expect(initArgs.integrations[0]).toEqual({ name: "BrowserTracing" });
  });

  it("does NOT include replay or profiling integrations", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    const initArgs = sentryInit.mock.calls[0][0];
    // Confirm the config object has no replay / profiling keys
    expect(initArgs).not.toHaveProperty("replaysSessionSampleRate");
    expect(initArgs).not.toHaveProperty("replaysOnErrorSampleRate");
    expect(initArgs).not.toHaveProperty("profileSessionSampleRate");
  });
});

describe("initializeBrowserSentry — beforeSend sanitization", () => {
  it("sanitizes event.request.data using sensitiveFields", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({
      dsn: "https://abc@sentry.io/123",
      sensitiveFields: ["creditCard"],
    });

    const { beforeSend } = sentryInit.mock.calls[0][0];
    expect(typeof beforeSend).toBe("function");

    const event = {
      request: {
        data: { username: "alice", creditCard: "4111111111111111" },
      },
    };

    const result = beforeSend(event);

    expect(result).not.toBeNull();
    expect(result.request.data.username).toBe("alice");
    expect(result.request.data.creditCard).toBe("[REDACTED]");
  });

  it("sanitizes default sensitive fields (e.g. password) in event.request.data", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    const { beforeSend } = sentryInit.mock.calls[0][0];

    const event = {
      request: {
        data: { username: "alice", password: "s3cr3t" },
      },
    };

    const result = beforeSend(event);

    expect(result.request.data.password).toBe("[REDACTED]");
    expect(result.request.data.username).toBe("alice");
  });

  it("returns the event unchanged when request.data is absent", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    const { beforeSend } = sentryInit.mock.calls[0][0];

    const event = { request: {} };
    const result = beforeSend(event);

    expect(result).toEqual({ request: {} });
  });
});

describe("initializeBrowserSentry — beforeBreadcrumb sanitization", () => {
  it("sanitizes breadcrumb.data using sensitiveFields", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({
      dsn: "https://abc@sentry.io/123",
      sensitiveFields: ["sessionToken"],
    });

    const { beforeBreadcrumb } = sentryInit.mock.calls[0][0];
    expect(typeof beforeBreadcrumb).toBe("function");

    const breadcrumb = {
      category: "fetch",
      data: { userId: "u1", sessionToken: "tok-abc" },
    };

    const result = beforeBreadcrumb(breadcrumb);

    expect(result).not.toBeNull();
    expect(result.data.userId).toBe("u1");
    expect(result.data.sessionToken).toBe("[REDACTED]");
  });

  it("sanitizes the URL for http category breadcrumbs", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    const { beforeBreadcrumb } = sentryInit.mock.calls[0][0];

    const breadcrumb = {
      category: "http",
      data: {
        url: "https://api.example.com/data?token=supersecret&page=1",
      },
    };

    const result = beforeBreadcrumb(breadcrumb);

    // sanitizeUrl replaces the param value — the raw secret must not appear
    expect(result.data.url).not.toContain("supersecret");
    // Non-sensitive params are preserved
    expect(result.data.url).toContain("page=1");
  });

  it("returns the breadcrumb unchanged when data is absent", async () => {
    const { initializeBrowserSentry, sentryInit } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    const { beforeBreadcrumb } = sentryInit.mock.calls[0][0];

    const breadcrumb = { category: "ui.click" };
    const result = beforeBreadcrumb(breadcrumb);

    expect(result).toEqual({ category: "ui.click" });
  });
});

describe("initializeBrowserSentry — createLogger call", () => {
  it("calls createLogger with the provided serviceName after Sentry.init", async () => {
    const { initializeBrowserSentry, sentryInit, createLogger } =
      await freshModule();

    initializeBrowserSentry({
      dsn: "https://abc@sentry.io/123",
      serviceName: "my-extension",
    });

    // Sentry.init called first
    expect(sentryInit).toHaveBeenCalledOnce();
    // createLogger called after
    expect(createLogger).toHaveBeenCalledOnce();
    expect(createLogger).toHaveBeenCalledWith("my-extension");
  });

  it("uses 'browser' as default serviceName when not provided", async () => {
    const { initializeBrowserSentry, createLogger } = await freshModule();

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    expect(createLogger).toHaveBeenCalledOnce();
    expect(createLogger).toHaveBeenCalledWith("browser");
  });

  it("calls createLogger AFTER Sentry.init (not before)", async () => {
    const { initializeBrowserSentry, sentryInit, createLogger } =
      await freshModule();

    const callOrder: string[] = [];
    sentryInit.mockImplementation(() => callOrder.push("init"));
    createLogger.mockImplementation(() => callOrder.push("createLogger"));

    initializeBrowserSentry({ dsn: "https://abc@sentry.io/123" });

    expect(callOrder).toEqual(["init", "createLogger"]);
  });
});

describe("initializeBrowserSentry — return value", () => {
  it("returns the Sentry module", async () => {
    const { initializeBrowserSentry, Sentry } = await freshModule();

    const result = initializeBrowserSentry({
      dsn: "https://abc@sentry.io/123",
    });

    expect(result).toBe(Sentry);
  });
});
