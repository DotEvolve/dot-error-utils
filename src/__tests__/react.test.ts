import { describe, it, expect, vi } from "vitest";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ErrorCategory,
  initializeReactSentry,
  Sentry,
} from "../react";

// Mock @sentry/react to avoid real Sentry calls during tests
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  browserProfilingIntegration: vi.fn(() => ({})),
  consoleLoggingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

// Validates: Requirements 3.7, 3.8

describe("initializeReactSentry", () => {
  it("does not throw when called with a valid DSN", () => {
    expect(() =>
      initializeReactSentry({ dsn: "https://test@sentry.io/1" }),
    ).not.toThrow();
  });

  it("returns the Sentry module", async () => {
    const Sentry = await import("@sentry/react");
    const result = initializeReactSentry({ dsn: "https://test@sentry.io/1" });
    expect(result).toBe(Sentry);
  });
});

describe("ErrorCategory export from react entry point", () => {
  it("has all expected keys", () => {
    expect(ErrorCategory).toMatchObject({
      VALIDATION: "validation",
      AUTHENTICATION: "authentication",
      AUTHORIZATION: "authorization",
      CONFLICT: "conflict",
      NOT_FOUND: "not_found",
      SYSTEM: "system",
    });
  });

  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(ErrorCategory)).toBe(true);
  });
});

describe("Error class exports from react entry point", () => {
  it("AppError constructs correctly", () => {
    const err = new AppError("something went wrong", 500, "system");
    expect(err.message).toBe("something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.category).toBe("system");
    expect(err).toBeInstanceOf(Error);
  });

  it("ValidationError has statusCode 400 and category 'validation'", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.category).toBe("validation");
    expect(err).toBeInstanceOf(AppError);
  });

  it("AuthenticationError has statusCode 401 and default message", () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Authentication required");
  });

  it("AuthorizationError has statusCode 403 and default message", () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Insufficient permissions");
  });

  it("NotFoundError formats message with resource and identifier", () => {
    const err = new NotFoundError("User", "abc-123");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found: abc-123");
  });

  it("ConflictError has statusCode 409 and category 'conflict'", () => {
    const err = new ConflictError("duplicate slug");
    expect(err.statusCode).toBe(409);
    expect(err.category).toBe("conflict");
  });
});
