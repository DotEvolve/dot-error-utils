import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import {
  errorHandlerMiddleware,
  setupSentryErrorHandler,
} from "../errorHandler";
import {
  AppError,
  ValidationError,
  NotFoundError,
} from "../../errors/AppError";
import { ErrorCategory } from "../../errors/ErrorCategory";

// Mock Sentry
vi.mock("@sentry/node", () => ({
  setContext: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
}));

// Mock sanitizer
vi.mock("../../utils/sanitizer", () => ({
  sanitizeData: vi.fn((data) => ({ ...data, sanitized: true })),
}));

describe("errorHandlerMiddleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: ReturnType<typeof vi.fn>;
  let jsonSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    statusSpy = vi.fn().mockReturnThis();
    jsonSpy = vi.fn();

    mockRequest = {
      correlationId: "test-correlation-id",
      path: "/api/test",
      method: "GET",
      query: {},
      body: {},
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("error categorization", () => {
    it("should use explicit category from AppError", () => {
      const error = new ValidationError("Invalid input");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            category: ErrorCategory.VALIDATION,
          }),
        }),
      );
    });

    it("should categorize 400 errors as validation", () => {
      const error = { statusCode: 400, message: "Bad request" };

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            category: ErrorCategory.VALIDATION,
          }),
        }),
      );
    });

    it("should categorize 401 errors as authentication", () => {
      const error = { statusCode: 401, message: "Unauthorized" };

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            category: ErrorCategory.AUTHENTICATION,
          }),
        }),
      );
    });

    it("should categorize 403 errors as authorization", () => {
      const error = { statusCode: 403, message: "Forbidden" };

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            category: ErrorCategory.AUTHORIZATION,
          }),
        }),
      );
    });

    it("should categorize 404 errors as not_found", () => {
      const error = new NotFoundError("User", "123");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            category: ErrorCategory.NOT_FOUND,
          }),
        }),
      );
    });

    it("should categorize 409 errors as conflict", () => {
      const error = { statusCode: 409, message: "Conflict" };

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            category: ErrorCategory.CONFLICT,
          }),
        }),
      );
    });

    it("should default to system category for unknown errors", () => {
      const error = new Error("Unknown error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            category: ErrorCategory.SYSTEM,
          }),
        }),
      );
    });
  });

  describe("Sentry integration", () => {
    it("should set Sentry context with error details", () => {
      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.setContext).toHaveBeenCalledWith(
        "error_details",
        expect.objectContaining({
          category: ErrorCategory.SYSTEM,
          statusCode: 500,
          path: "/api/test",
          method: "GET",
          correlationId: "test-correlation-id",
        }),
      );
    });

    it("should set Sentry tags for filtering", () => {
      const error = new ValidationError("Invalid input");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.setTag).toHaveBeenCalledWith(
        "error_category",
        ErrorCategory.VALIDATION,
      );
      expect(Sentry.setTag).toHaveBeenCalledWith("status_code", 400);
      expect(Sentry.setTag).toHaveBeenCalledWith(
        "correlation_id",
        "test-correlation-id",
      );
    });

    it("should set user context when available", () => {
      mockRequest.user = {
        id: "user-123",
        email: "test@example.com",
        role: "admin",
      };

      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "user-123",
        email: "test@example.com",
        role: "admin",
      });
    });

    it("should set tenant context when available", () => {
      mockRequest.tenantId = "tenant-456";

      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.setTag).toHaveBeenCalledWith("tenant_id", "tenant-456");
    });

    it("should add breadcrumb for error", () => {
      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "error",
          message: "Test error",
          level: "error",
        }),
      );
    });

    it("should use warning level for 4xx errors", () => {
      const error = new ValidationError("Invalid input");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warning",
        }),
      );
    });

    it("should capture 500 errors to Sentry", () => {
      const error = new Error("Server error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          contexts: expect.any(Object),
        }),
      );
    });

    it("should not capture validation errors to Sentry", () => {
      const error = new ValidationError("Invalid input");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("should capture non-operational errors to Sentry", () => {
      const error = { message: "Non-operational error", isOperational: false };

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe("error response structure", () => {
    it("should return standardized error response", () => {
      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            category: expect.any(String),
            message: "Test error",
            correlationId: "test-correlation-id",
          }),
          timestamp: expect.any(String),
        }),
      );
    });

    it("should include validation details for validation errors", () => {
      const details = { email: ["Email is required"] };
      const error = new ValidationError("Validation failed", details);

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details,
          }),
        }),
      );
    });

    it("should include stack trace in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should not include stack trace in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const response = jsonSpy.mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle missing correlation ID", () => {
      mockRequest.correlationId = undefined;
      const error = new Error("Test error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            correlationId: "unknown",
          }),
        }),
      );
    });

    it("should use default message for errors without message", () => {
      const error = { statusCode: 500 };

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "An error occurred",
          }),
        }),
      );
    });
  });

  describe("status codes", () => {
    it("should use error statusCode when available", () => {
      const error = { statusCode: 418, message: "I'm a teapot" };

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusSpy).toHaveBeenCalledWith(418);
    });

    it("should default to 500 for errors without statusCode", () => {
      const error = new Error("Generic error");

      errorHandlerMiddleware(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
    });
  });
});

describe("setupSentryErrorHandler", () => {
  it("should call Sentry.setupExpressErrorHandler", () => {
    const mockApp = {
      use: vi.fn(),
    };

    setupSentryErrorHandler(mockApp);

    expect(Sentry.setupExpressErrorHandler).toHaveBeenCalledWith(mockApp);
  });

  it("should register custom error handler middleware", () => {
    const mockApp = {
      use: vi.fn(),
    };

    setupSentryErrorHandler(mockApp);

    expect(mockApp.use).toHaveBeenCalledWith(errorHandlerMiddleware);
  });
});
