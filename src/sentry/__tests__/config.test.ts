import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { initializeSentry, SentryConfig } from "../config";

// Mock Sentry
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
  startSpan: vi.fn((config, callback) => callback()),
  getActiveSpan: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
}));

// Sentry and profiling are now mocked in src/__tests__/setup.ts

vi.mock("../../utils/sanitizer", () => ({
  sanitizeData: vi.fn((data) => ({ ...data, sanitized: true })),
  sanitizeUrl: vi.fn((url) => url.replace(/token=[^&]+/, "token=***")),
}));

describe("Sentry Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initializeSentry", () => {
    it("should initialize Sentry with minimal config", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      const result = initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123",
          serverName: "test-service",
          environment: "development",
        }),
      );
      expect(result).toBe(Sentry);
    });

    it("should use custom environment when provided", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
        environment: "staging",
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "staging",
        }),
      );
    });

    it("should use NODE_ENV when environment not provided", () => {
      process.env.NODE_ENV = "production";

      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "production",
        }),
      );
    });

    it("should set release when provided", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
        release: "v1.2.3",
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          release: "v1.2.3",
        }),
      );
    });

    it("should use production sample rates in production", () => {
      process.env.NODE_ENV = "production";

      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
        environment: "production",
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.1,
          profilesSampleRate: 0.1,
        }),
      );
    });

    it("should use development sample rates in development", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
        environment: "development",
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
          profilesSampleRate: 1.0,
        }),
      );
    });

    it("should use custom sample rates when provided", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
        tracesSampleRate: 0.5,
        profilesSampleRate: 0.3,
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.5,
          profilesSampleRate: 0.3,
        }),
      );
    });

    it("should include profiling integration", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          integrations: expect.arrayContaining([
            expect.objectContaining({ name: "ProfilingIntegration" }),
          ]),
        }),
      );
    });

    it("should ignore known non-critical errors", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          ignoreErrors: ["ECONNRESET", "EPIPE", "ECONNREFUSED"],
        }),
      );
    });
  });

  describe("beforeSend hook", () => {
    it("should sanitize request data", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
        sensitiveFields: ["password", "token"],
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        request: {
          data: {
            username: "test",
            password: "secret",
          },
        },
      };

      const result = beforeSend(event, {});

      expect(result.request.data).toHaveProperty("sanitized", true);
    });

    it("should sanitize extra context", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        extra: {
          apiKey: "secret-key",
          userId: "123",
        },
      };

      const result = beforeSend(event, {});

      expect(result.extra).toHaveProperty("sanitized", true);
    });

    it("should handle events without request data", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        message: "Test error",
      };

      const result = beforeSend(event, {});

      expect(result).toEqual(event);
    });

    it("should handle events without extra context", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        request: {
          data: { test: "data" },
        },
      };

      const result = beforeSend(event, {});

      expect(result.request.data).toHaveProperty("sanitized", true);
    });
  });

  describe("beforeBreadcrumb hook", () => {
    it("should sanitize HTTP breadcrumb URLs", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeBreadcrumb = initCall.beforeBreadcrumb;

      const breadcrumb = {
        category: "http",
        data: {
          url: "https://api.example.com/users?token=secret123",
        },
      };

      const result = beforeBreadcrumb(breadcrumb, {});

      expect(result.data.url).toBe("https://api.example.com/users?token=***");
    });

    it("should sanitize breadcrumb data", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeBreadcrumb = initCall.beforeBreadcrumb;

      const breadcrumb = {
        category: "console",
        data: {
          message: "User logged in",
          userId: "123",
        },
      };

      const result = beforeBreadcrumb(breadcrumb, {});

      expect(result.data).toHaveProperty("sanitized", true);
    });

    it("should handle breadcrumbs without data", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeBreadcrumb = initCall.beforeBreadcrumb;

      const breadcrumb = {
        category: "navigation",
        message: "User navigated",
      };

      const result = beforeBreadcrumb(breadcrumb, {});

      expect(result).toEqual(breadcrumb);
    });

    it("should handle non-HTTP breadcrumbs", () => {
      const config: SentryConfig = {
        dsn: "https://test@sentry.io/123",
        serviceName: "test-service",
      };

      initializeSentry(config);

      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeBreadcrumb = initCall.beforeBreadcrumb;

      const breadcrumb = {
        category: "console",
        data: {
          message: "Debug log",
        },
      };

      const result = beforeBreadcrumb(breadcrumb, {});

      expect(result.data).toHaveProperty("sanitized", true);
    });
  });
});

// Tests for initializeReactSentry (configReact.ts)
// Requirements: 3.3

vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: "BrowserTracing" })),
  replayIntegration: vi.fn(() => ({ name: "Replay" })),
}));

import * as SentryReact from "@sentry/react";
import { initializeReactSentry, ReactSentryConfig } from "../configReact";

describe("initializeReactSentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call React Sentry init with provided dsn and environment", () => {
    const config: ReactSentryConfig = {
      dsn: "https://react-test@sentry.io/456",
      environment: "production",
    };

    initializeReactSentry(config);

    expect(SentryReact.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://react-test@sentry.io/456",
        environment: "production",
      }),
    );
  });

  it("should default environment to development when not provided", () => {
    const config: ReactSentryConfig = {
      dsn: "https://react-test@sentry.io/456",
    };

    initializeReactSentry(config);

    expect(SentryReact.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://react-test@sentry.io/456",
        environment: "development",
      }),
    );
  });

  it("should return the Sentry React instance", () => {
    const config: ReactSentryConfig = {
      dsn: "https://react-test@sentry.io/456",
    };

    const result = initializeReactSentry(config);

    expect(result).toBe(SentryReact);
  });

  it("should pass release when provided", () => {
    const config: ReactSentryConfig = {
      dsn: "https://react-test@sentry.io/456",
      release: "v2.0.0",
    };

    initializeReactSentry(config);

    expect(SentryReact.init).toHaveBeenCalledWith(
      expect.objectContaining({
        release: "v2.0.0",
      }),
    );
  });
});

// Feature: platform-improvements, Property 9: initializeSentry passes config to Sentry.init
// Validates: Requirements 3.1
import * as fc from "fast-check";

describe("Property 9: initializeSentry passes config to Sentry.init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any dsn and serviceName, Sentry.init is called with those exact values", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (dsn, serviceName) => {
        vi.clearAllMocks();

        initializeSentry({ dsn, serviceName });

        expect(Sentry.init).toHaveBeenCalledWith(
          expect.objectContaining({
            dsn,
            serverName: serviceName,
          }),
        );
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: platform-improvements, Property 10: initializeReactSentry passes config to Sentry.init
// Validates: Requirements 3.3
describe("Property 10: initializeReactSentry passes config to Sentry.init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any dsn and environment, SentryReact.init is called with those exact values", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom("development", "production", "staging", "test"),
        (dsn, environment) => {
          vi.clearAllMocks();

          initializeReactSentry({ dsn, environment });

          expect(SentryReact.init).toHaveBeenCalledWith(
            expect.objectContaining({
              dsn,
              environment,
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
