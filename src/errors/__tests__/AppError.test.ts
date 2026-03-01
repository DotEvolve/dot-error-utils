import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from "../AppError";
import { ErrorCategory } from "../ErrorCategory";

describe("AppError", () => {
  describe("constructor", () => {
    it("should create an error with all properties", () => {
      const error = new AppError("Test error", 500, ErrorCategory.SYSTEM, {
        key: "value",
      });

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.details).toEqual({ key: "value" });
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it("should create an error without details", () => {
      const error = new AppError("Test error", 500, ErrorCategory.SYSTEM);

      expect(error.details).toBeNull();
    });

    it("should maintain proper stack trace", () => {
      const error = new AppError("Test error", 500, ErrorCategory.SYSTEM);

      expect(error.stack).toContain("AppError");
      expect(error.stack).toContain("Test error");
    });
  });

  describe("toSentryContext", () => {
    it("should serialize error details for Sentry", () => {
      const error = new AppError("Test error", 500, ErrorCategory.SYSTEM, {
        key: "value",
      });
      const context = error.toSentryContext();

      expect(context).toEqual({
        category: ErrorCategory.SYSTEM,
        statusCode: 500,
        details: { key: "value" },
        isOperational: true,
      });
    });

    it("should handle null details", () => {
      const error = new AppError("Test error", 500, ErrorCategory.SYSTEM);
      const context = error.toSentryContext();

      expect(context.details).toBeNull();
    });
  });
});

describe("ValidationError", () => {
  it("should create a validation error with 400 status code", () => {
    const error = new ValidationError("Invalid input");

    expect(error.message).toBe("Invalid input");
    expect(error.statusCode).toBe(400);
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.isOperational).toBe(true);
  });

  it("should include field-level validation details", () => {
    const details = {
      email: ["Email is required", "Email must be valid"],
      password: ["Password must be at least 8 characters"],
    };
    const error = new ValidationError("Validation failed", details);

    expect(error.details).toEqual(details);
  });

  it("should work without details", () => {
    const error = new ValidationError("Validation failed");

    expect(error.details).toBeUndefined();
  });
});

describe("AuthenticationError", () => {
  it("should create an authentication error with 401 status code", () => {
    const error = new AuthenticationError();

    expect(error.message).toBe("Authentication required");
    expect(error.statusCode).toBe(401);
    expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
  });

  it("should accept custom message", () => {
    const error = new AuthenticationError("Invalid credentials");

    expect(error.message).toBe("Invalid credentials");
  });
});

describe("AuthorizationError", () => {
  it("should create an authorization error with 403 status code", () => {
    const error = new AuthorizationError();

    expect(error.message).toBe("Insufficient permissions");
    expect(error.statusCode).toBe(403);
    expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
  });

  it("should accept custom message", () => {
    const error = new AuthorizationError("Admin access required");

    expect(error.message).toBe("Admin access required");
  });
});

describe("NotFoundError", () => {
  it("should create a not found error with 404 status code", () => {
    const error = new NotFoundError("User");

    expect(error.message).toBe("User not found");
    expect(error.statusCode).toBe(404);
    expect(error.category).toBe(ErrorCategory.NOT_FOUND);
  });

  it("should include identifier in message", () => {
    const error = new NotFoundError("User", "123");

    expect(error.message).toBe("User not found: 123");
  });

  it("should work without identifier", () => {
    const error = new NotFoundError("Resource");

    expect(error.message).toBe("Resource not found");
  });
});

describe("ConflictError", () => {
  it("should create a conflict error with 409 status code", () => {
    const error = new ConflictError("Resource already exists");

    expect(error.message).toBe("Resource already exists");
    expect(error.statusCode).toBe(409);
    expect(error.category).toBe(ErrorCategory.CONFLICT);
  });

  it("should include details", () => {
    const details = { existingId: "123" };
    const error = new ConflictError("Duplicate entry", details);

    expect(error.details).toEqual(details);
  });

  it("should work without details", () => {
    const error = new ConflictError("Conflict occurred");

    expect(error.details).toBeUndefined();
  });
});
