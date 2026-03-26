import { describe, it, expect, vi } from "vitest";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from "../errors/AppError";
import { withTransaction } from "../db/transactionHandler";

// Mock @sentry/node to avoid real Sentry calls during tests
vi.mock("@sentry/node", () => ({
  startSpan: vi.fn((_opts: any, cb: () => any) => cb()),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

// Validates: Requirements 3.7, 3.8

describe("AppError", () => {
  it("constructs with message, statusCode, and category", () => {
    const err = new AppError("something went wrong", 500, "system");
    expect(err.message).toBe("something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.category).toBe("system");
  });

  it("is an instance of Error", () => {
    const err = new AppError("oops", 500, "system");
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of AppError", () => {
    const err = new AppError("oops", 500, "system");
    expect(err).toBeInstanceOf(AppError);
  });

  it("sets isOperational to true", () => {
    const err = new AppError("oops", 500, "system");
    expect(err.isOperational).toBe(true);
  });

  it("stores optional details", () => {
    const details = { field: "email" };
    const err = new AppError("bad input", 400, "validation", details);
    expect(err.details).toEqual(details);
  });
});

describe("ValidationError", () => {
  it("has statusCode 400", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
  });

  it("has category 'validation'", () => {
    const err = new ValidationError("invalid input");
    expect(err.category).toBe("validation");
  });

  it("is instanceof AppError", () => {
    const err = new ValidationError("invalid input");
    expect(err).toBeInstanceOf(AppError);
  });

  it("is instanceof Error", () => {
    const err = new ValidationError("invalid input");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("AuthenticationError", () => {
  it("has statusCode 401", () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
  });

  it("has category 'authentication'", () => {
    const err = new AuthenticationError();
    expect(err.category).toBe("authentication");
  });

  it("uses default message when none provided", () => {
    const err = new AuthenticationError();
    expect(err.message).toBe("Authentication required");
  });

  it("accepts a custom message", () => {
    const err = new AuthenticationError("Token expired");
    expect(err.message).toBe("Token expired");
  });

  it("is instanceof AppError", () => {
    expect(new AuthenticationError()).toBeInstanceOf(AppError);
  });
});

describe("AuthorizationError", () => {
  it("has statusCode 403", () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
  });

  it("has category 'authorization'", () => {
    const err = new AuthorizationError();
    expect(err.category).toBe("authorization");
  });

  it("uses default message when none provided", () => {
    const err = new AuthorizationError();
    expect(err.message).toBe("Insufficient permissions");
  });

  it("is instanceof AppError", () => {
    expect(new AuthorizationError()).toBeInstanceOf(AppError);
  });
});

describe("NotFoundError", () => {
  it("has statusCode 404", () => {
    const err = new NotFoundError("User");
    expect(err.statusCode).toBe(404);
  });

  it("has category 'not_found'", () => {
    const err = new NotFoundError("User");
    expect(err.category).toBe("not_found");
  });

  it("formats message without identifier", () => {
    const err = new NotFoundError("Tenant");
    expect(err.message).toBe("Tenant not found");
  });

  it("formats message with identifier", () => {
    const err = new NotFoundError("Tenant", "abc-123");
    expect(err.message).toBe("Tenant not found: abc-123");
  });

  it("is instanceof AppError", () => {
    expect(new NotFoundError("Resource")).toBeInstanceOf(AppError);
  });
});

describe("ConflictError", () => {
  it("has statusCode 409", () => {
    const err = new ConflictError("duplicate slug");
    expect(err.statusCode).toBe(409);
  });

  it("has category 'conflict'", () => {
    const err = new ConflictError("duplicate slug");
    expect(err.category).toBe("conflict");
  });

  it("is instanceof AppError", () => {
    expect(new ConflictError("conflict")).toBeInstanceOf(AppError);
  });
});

describe("withTransaction", () => {
  const mockPrisma = {
    $transaction: async (cb: any) => cb({}),
  };

  it("re-throws the error when the callback throws", async () => {
    const originalError = new Error("db failure");
    await expect(
      withTransaction(mockPrisma, async () => {
        throw originalError;
      }),
    ).rejects.toThrow("db failure");
  });

  it("re-throws the exact same error reference", async () => {
    const originalError = new AppError("tx failed", 500, "system");
    let caught: unknown;
    try {
      await withTransaction(mockPrisma, async () => {
        throw originalError;
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBe(originalError);
  });

  it("returns the callback result on success", async () => {
    const result = await withTransaction(mockPrisma, async () => 42);
    expect(result).toBe(42);
  });
});

// Feature: codebase-quality-improvements, Property 3: AppError Serialization Round-Trip
// Validates: Requirements 3.9

import * as fc from "fast-check";

describe("AppError serialization round-trip (Property 3)", () => {
  it("preserves message, statusCode, and category for any valid constructor inputs", () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 1 }),
          statusCode: fc.integer({ min: 400, max: 599 }),
          category: fc.constantFrom(
            "validation",
            "authentication",
            "authorization",
            "conflict",
            "not_found",
            "system",
          ),
        }),
        ({ message, statusCode, category }) => {
          const err = new AppError(message, statusCode, category as any);
          expect(err.message).toBe(message);
          expect(err.statusCode).toBe(statusCode);
          expect(err.category).toBe(category);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: codebase-quality-improvements, Property 4: withTransaction Error Re-Throw Preservation
// Validates: Requirements 3.10

describe("withTransaction error re-throw preservation (Property 4)", () => {
  it("re-throws the exact same reference for any thrown value", async () => {
    const mockPrisma = { $transaction: async (cb: any) => cb({}) };

    // Use a constrained arbitrary to avoid objects with non-callable toString
    // (which would cause JS to throw a TypeError instead of the original value)
    const throwableArbitrary = fc.oneof(
      fc.string().map((s) => new Error(s)),
      fc.string().map((s) => new AppError(s || "err", 500, "system")),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
    );

    await fc.assert(
      fc.asyncProperty(throwableArbitrary, async (thrownValue) => {
        let caught: unknown = undefined;
        try {
          await withTransaction(mockPrisma, async () => {
            throw thrownValue;
          });
        } catch (e) {
          caught = e;
        }
        expect(caught).toBe(thrownValue);
      }),
      { numRuns: 100 },
    );
  });
});
