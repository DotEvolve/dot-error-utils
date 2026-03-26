import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { setupSentryMiddleware } from "../middleware/sentryMiddleware";
import { correlationIdMiddleware } from "../middleware/correlationId";
import { setupSentryErrorHandler } from "../middleware/errorHandler";

// Mock @sentry/node to avoid real Sentry calls during tests
vi.mock("@sentry/node", () => ({
  getActiveSpan: vi.fn(() => null),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
}));

// Validates: Requirements 3.7, 3.8

describe("setupSentryMiddleware", () => {
  it("attaches middleware to an Express app without throwing", () => {
    const app = express();
    expect(() => setupSentryMiddleware(app)).not.toThrow();
  });
});

describe("correlationIdMiddleware", () => {
  it("sets req.correlationId and X-Correlation-Id header, then calls next", () => {
    const req = { headers: {} } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-Correlation-Id",
      expect.any(String),
    );
    expect(next).toHaveBeenCalled();
  });

  it("preserves an existing X-Correlation-Id from request headers", () => {
    const existingId = "my-existing-id";
    const req = { headers: { "x-correlation-id": existingId } } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith("X-Correlation-Id", existingId);
  });

  it("generates a new UUID when no X-Correlation-Id header is present", () => {
    const req = { headers: {} } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);

    // UUID v4 pattern
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("setupSentryErrorHandler", () => {
  it("attaches error handler to an Express app without throwing", () => {
    const app = express();
    expect(() => setupSentryErrorHandler(app)).not.toThrow();
  });
});
