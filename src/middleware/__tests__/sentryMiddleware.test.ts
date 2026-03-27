import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import {
  setupSentryMiddleware,
  attachSentryContext,
} from "../sentryMiddleware";

// Mock Sentry
vi.mock("@sentry/node", () => ({
  getActiveSpan: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
}));

describe("setupSentryMiddleware", () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      use: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it("should register middleware with app", () => {
    setupSentryMiddleware(mockApp);

    expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should expose trace ID as correlationId", () => {
    const traceId = "test-trace-id-123";
    vi.mocked(Sentry.getActiveSpan).mockReturnValue({
      spanContext: () => ({ traceId }),
    } as any);

    setupSentryMiddleware(mockApp);
    const middleware = mockApp.use.mock.calls[0][0];

    const req = {} as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.correlationId).toBe(traceId);
  });

  it("should generate fallback ID when no Sentry span", () => {
    vi.mocked(Sentry.getActiveSpan).mockReturnValue(null);

    setupSentryMiddleware(mockApp);
    const middleware = mockApp.use.mock.calls[0][0];

    const req = {} as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.correlationId).toBeDefined();
    expect(req.correlationId).toMatch(/^fallback-/);
  });

  it("should set response headers", () => {
    vi.mocked(Sentry.getActiveSpan).mockReturnValue({
      spanContext: () => ({ traceId: "test-id" }),
    } as any);

    setupSentryMiddleware(mockApp);
    const middleware = mockApp.use.mock.calls[0][0];

    const req = {} as Request;
    const setHeaderSpy = vi.fn();
    const res = { setHeader: setHeaderSpy } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(setHeaderSpy).toHaveBeenCalledWith("X-Correlation-Id", "test-id");
    expect(setHeaderSpy).toHaveBeenCalledWith("X-Sentry-Trace-Id", "test-id");
  });

  it("should add breadcrumb for request", () => {
    vi.mocked(Sentry.getActiveSpan).mockReturnValue({
      spanContext: () => ({ traceId: "test-id" }),
    } as any);

    setupSentryMiddleware(mockApp);
    const middleware = mockApp.use.mock.calls[0][0];

    const req = {
      method: "GET",
      path: "/api/test",
      url: "/api/test?id=1",
    } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "request",
        message: "GET /api/test",
        level: "info",
      }),
    );
  });

  it("should call next to continue middleware chain", () => {
    vi.mocked(Sentry.getActiveSpan).mockReturnValue(null);

    setupSentryMiddleware(mockApp);
    const middleware = mockApp.use.mock.calls[0][0];

    const req = {} as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should complete setup without throwing when Sentry is not initialised", () => {
    // Sentry.getActiveSpan returns undefined when Sentry has not been initialised
    vi.mocked(Sentry.getActiveSpan).mockReturnValue(undefined);

    // setupSentryMiddleware itself must not throw
    expect(() => setupSentryMiddleware(mockApp)).not.toThrow();

    // The registered middleware must also not throw when invoked
    const middleware = mockApp.use.mock.calls[0][0];
    const req = {} as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    expect(() => middleware(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
    // Falls back to a generated ID rather than a Sentry trace ID
    expect(req.correlationId).toBeDefined();
    expect(req.correlationId).toMatch(/^fallback-/);
  });
});

describe("attachSentryContext", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      correlationId: "test-correlation-id",
      path: "/api/test",
      method: "POST",
      query: { page: "1" },
      ip: "127.0.0.1",
    };
    mockResponse = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it("should set user context when user is present", () => {
    mockRequest.user = {
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      role: "admin",
    };

    attachSentryContext(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      role: "admin",
    });
  });

  it("should not set user context when user is not present", () => {
    attachSentryContext(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it("should set request details context", () => {
    mockRequest.tenantId = "tenant-456";

    attachSentryContext(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(Sentry.setContext).toHaveBeenCalledWith(
      "request_details",
      expect.objectContaining({
        correlationId: "test-correlation-id",
        tenantId: "tenant-456",
        path: "/api/test",
        method: "POST",
        query: { page: "1" },
        ip: "127.0.0.1",
      }),
    );
  });

  it("should set tenant tag when tenantId is present", () => {
    mockRequest.tenantId = "tenant-789";

    attachSentryContext(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(Sentry.setTag).toHaveBeenCalledWith("tenant_id", "tenant-789");
  });

  it("should set user role tag when user has role", () => {
    mockRequest.user = {
      id: "user-123",
      role: "admin",
    };

    attachSentryContext(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(Sentry.setTag).toHaveBeenCalledWith("user_role", "admin");
  });

  it("should not set role tag when user has no role", () => {
    mockRequest.user = {
      id: "user-123",
    };

    attachSentryContext(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(Sentry.setTag).not.toHaveBeenCalledWith(
      "user_role",
      expect.anything(),
    );
  });

  it("should call next to continue middleware chain", () => {
    attachSentryContext(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
