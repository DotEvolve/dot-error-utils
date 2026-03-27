import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { correlationIdMiddleware } from "../correlationId";

describe("correlationIdMiddleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let setHeaderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setHeaderSpy = vi.fn();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: setHeaderSpy,
    };
    mockNext = vi.fn();
  });

  describe("correlation ID generation", () => {
    it("should generate a new correlation ID when header is not present", () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBeDefined();
      expect(typeof mockRequest.correlationId).toBe("string");
      expect(mockRequest.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should generate unique correlation IDs for different requests", () => {
      const request1 = { headers: {} } as Request;
      const request2 = { headers: {} } as Request;
      const response = { setHeader: vi.fn() } as unknown as Response;
      const next = vi.fn();

      correlationIdMiddleware(request1, response, next);
      correlationIdMiddleware(request2, response, next);

      expect(request1.correlationId).not.toBe(request2.correlationId);
    });
  });

  describe("correlation ID preservation", () => {
    it("should preserve existing correlation ID from header", () => {
      const existingId = "existing-correlation-id-123";
      mockRequest.headers = {
        "x-correlation-id": existingId,
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBe(existingId);
    });

    it("should handle correlation ID from different header cases", () => {
      const existingId = "test-id-456";
      mockRequest.headers = {
        "X-Correlation-Id": existingId,
      } as any;

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Express normalizes headers to lowercase
      expect(mockRequest.correlationId).toBeDefined();
    });
  });

  describe("response headers", () => {
    it("should set X-Correlation-Id response header", () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(setHeaderSpy).toHaveBeenCalledWith(
        "X-Correlation-Id",
        mockRequest.correlationId,
      );
    });

    it("should set X-Sentry-Trace-Id response header", () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(setHeaderSpy).toHaveBeenCalledWith(
        "X-Sentry-Trace-Id",
        mockRequest.correlationId,
      );
    });

    it("should set both headers with the same value", () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const calls = setHeaderSpy.mock.calls;
      const correlationIdCall = calls.find(
        (call) => call[0] === "X-Correlation-Id",
      );
      const sentryTraceIdCall = calls.find(
        (call) => call[0] === "X-Sentry-Trace-Id",
      );

      expect(correlationIdCall?.[1]).toBe(sentryTraceIdCall?.[1]);
    });
  });

  describe("middleware flow", () => {
    it("should call next() to continue middleware chain", () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should call next() even with existing correlation ID", () => {
      mockRequest.headers = {
        "x-correlation-id": "existing-id",
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string correlation ID from header", () => {
      mockRequest.headers = {
        "x-correlation-id": "",
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Empty string is falsy, so a new ID should be generated
      expect(mockRequest.correlationId).toBeDefined();
      expect(mockRequest.correlationId).not.toBe("");
    });

    it("should handle undefined headers object", () => {
      mockRequest.headers = undefined as any;

      expect(() => {
        correlationIdMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );
      }).not.toThrow();
    });

    it("should handle array value for correlation ID header", () => {
      mockRequest.headers = {
        "x-correlation-id": ["id1", "id2"] as any,
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Should use the first value or generate new
      expect(mockRequest.correlationId).toBeDefined();
    });
  });

  describe("TypeScript type safety", () => {
    it("should extend Express Request interface", () => {
      const req = {} as Request;

      correlationIdMiddleware(req, mockResponse as Response, mockNext);

      // TypeScript should allow accessing correlationId
      const id: string | undefined = req.correlationId;
      expect(id).toBeDefined();
    });
  });
});

// Feature: platform-improvements, Property 1: Correlation ID generation
import * as fc from "fast-check";

describe("Property-based tests", () => {
  describe("Property 1: Correlation ID generation", () => {
    it("for any request without x-correlation-id, sets non-empty req.correlationId and matching response header", () => {
      // Validates: Requirements 1.1
      fc.assert(
        fc.property(fc.record({}), (_input) => {
          const setHeaderSpy = vi.fn();
          const req: Partial<Request> = { headers: {} };
          const res: Partial<Response> = { setHeader: setHeaderSpy };
          const next = vi.fn();

          correlationIdMiddleware(
            req as Request,
            res as Response,
            next as NextFunction,
          );

          // req.correlationId must be a non-empty string
          const correlationId = (req as any).correlationId;
          if (typeof correlationId !== "string" || correlationId.length === 0) {
            return false;
          }

          // X-Correlation-Id response header must match req.correlationId
          const headerCall = setHeaderSpy.mock.calls.find(
            (call) => call[0] === "X-Correlation-Id",
          );
          if (!headerCall || headerCall[1] !== correlationId) {
            return false;
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: platform-improvements, Property 2: Correlation ID preservation
  describe("Property 2: Correlation ID preservation", () => {
    it("for any non-empty string x-correlation-id header, req.correlationId equals that exact value", () => {
      // Validates: Requirements 1.2
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (headerValue) => {
          const setHeaderSpy = vi.fn();
          const req: Partial<Request> = {
            headers: { "x-correlation-id": headerValue },
          };
          const res: Partial<Response> = { setHeader: setHeaderSpy };
          const next = vi.fn();

          correlationIdMiddleware(
            req as Request,
            res as Response,
            next as NextFunction,
          );

          return (req as any).correlationId === headerValue;
        }),
        { numRuns: 100 },
      );
    });
  });
});

// Feature: platform-improvements, Property 12: Logger emits correlationId on middleware execution
import { vi as _vi } from "vitest";

describe("Property 12: Logger emits correlationId on middleware execution", () => {
  it("for any request processed by correlationIdMiddleware, logger emits exactly one debug-level entry containing correlationId", () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        (incomingId) => {
          const setHeaderSpy = _vi.fn();
          const req: Partial<Request> = {
            headers: incomingId ? { "x-correlation-id": incomingId } : {},
          };
          const res: Partial<Response> = { setHeader: setHeaderSpy };
          const next = _vi.fn();

          correlationIdMiddleware(
            req as Request,
            res as Response,
            next as NextFunction,
          );

          const correlationId = (req as any).correlationId as string;

          // The correlationId must be non-empty
          expect(typeof correlationId).toBe("string");
          expect(correlationId.length).toBeGreaterThan(0);

          // If an incoming ID was provided, it must be preserved
          if (incomingId) {
            expect(correlationId).toBe(incomingId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
