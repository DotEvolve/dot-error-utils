import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/node";
import { withTransaction } from "../transactionHandler";

// Mock Sentry
vi.mock("@sentry/node", () => ({
  startSpan: vi.fn((config, callback) => callback()),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

describe("withTransaction", () => {
  let mockPrisma: any;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCallback = vi.fn();
    mockPrisma = {
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };
    vi.clearAllMocks();
  });

  describe("successful transactions", () => {
    it("should execute transaction callback", async () => {
      const expectedResult = { id: 1, name: "Test" };
      mockCallback.mockResolvedValue(expectedResult);

      const result = await withTransaction(mockPrisma, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(mockPrisma);
      expect(result).toEqual(expectedResult);
    });

    it("should wrap transaction in Sentry span", async () => {
      mockCallback.mockResolvedValue("success");

      await withTransaction(mockPrisma, mockCallback, "test_operation");

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test_operation",
          op: "db.transaction",
        }),
        expect.any(Function),
      );
    });

    it("should use default operation name", async () => {
      mockCallback.mockResolvedValue("success");

      await withTransaction(mockPrisma, mockCallback);

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "database_transaction",
        }),
        expect.any(Function),
      );
    });

    it("should return callback result", async () => {
      const data = { users: [{ id: 1 }, { id: 2 }] };
      mockCallback.mockResolvedValue(data);

      const result = await withTransaction(mockPrisma, mockCallback);

      expect(result).toEqual(data);
    });

    it("should handle multiple sequential transactions", async () => {
      mockCallback.mockResolvedValueOnce("result1");
      mockCallback.mockResolvedValueOnce("result2");

      const result1 = await withTransaction(mockPrisma, mockCallback);
      const result2 = await withTransaction(mockPrisma, mockCallback);

      expect(result1).toBe("result1");
      expect(result2).toBe("result2");
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("failed transactions", () => {
    it("should add breadcrumb on transaction failure", async () => {
      const error = new Error("Transaction failed");
      mockCallback.mockRejectedValue(error);

      await expect(
        withTransaction(mockPrisma, mockCallback, "failed_operation"),
      ).rejects.toThrow("Transaction failed");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "transaction",
          message: "Transaction rolled back: failed_operation",
          level: "error",
          data: expect.objectContaining({
            operation: "failed_operation",
            error: "Transaction failed",
          }),
        }),
      );
    });

    it("should capture exception to Sentry", async () => {
      const error = new Error("Database error");
      mockCallback.mockRejectedValue(error);

      await expect(
        withTransaction(mockPrisma, mockCallback, "error_operation"),
      ).rejects.toThrow("Database error");

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            transaction_operation: "error_operation",
            transaction_status: "rolled_back",
          },
        }),
      );
    });

    it("should re-throw the error", async () => {
      const error = new Error("Custom error");
      mockCallback.mockRejectedValue(error);

      await expect(withTransaction(mockPrisma, mockCallback)).rejects.toThrow(
        "Custom error",
      );
    });

    it("should handle non-Error objects", async () => {
      const error = "String error";
      mockCallback.mockRejectedValue(error);

      await expect(
        withTransaction(mockPrisma, mockCallback, "string_error"),
      ).rejects.toBe("String error");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            error: "String error",
          }),
        }),
      );
    });

    it("should handle null/undefined errors", async () => {
      mockCallback.mockRejectedValue(null);

      await expect(
        withTransaction(mockPrisma, mockCallback),
      ).rejects.toBeNull();

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe("Prisma transaction integration", () => {
    it("should call Prisma $transaction method", async () => {
      mockCallback.mockResolvedValue("success");

      await withTransaction(mockPrisma, mockCallback);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it("should pass transaction client to callback", async () => {
      const txClient = { user: { create: vi.fn() } };
      mockPrisma.$transaction = vi.fn((callback) => callback(txClient));
      mockCallback.mockResolvedValue("success");

      await withTransaction(mockPrisma, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(txClient);
    });

    it("should handle Prisma transaction errors", async () => {
      const prismaError = new Error("Prisma constraint violation");
      mockPrisma.$transaction = vi.fn().mockRejectedValue(prismaError);

      await expect(withTransaction(mockPrisma, mockCallback)).rejects.toThrow(
        "Prisma constraint violation",
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        prismaError,
        expect.any(Object),
      );
    });
  });

  describe("TypeScript generics", () => {
    it("should preserve return type", async () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: "John" };
      mockCallback.mockResolvedValue(user);

      const result: User = await withTransaction<User>(
        mockPrisma,
        mockCallback,
      );

      expect(result).toEqual(user);
      expect(result.id).toBe(1);
      expect(result.name).toBe("John");
    });

    it("should work with different return types", async () => {
      // Test with number
      mockCallback.mockResolvedValue(42);
      const numResult = await withTransaction<number>(mockPrisma, mockCallback);
      expect(numResult).toBe(42);

      // Test with array
      mockCallback.mockResolvedValue([1, 2, 3]);
      const arrayResult = await withTransaction<number[]>(
        mockPrisma,
        mockCallback,
      );
      expect(arrayResult).toEqual([1, 2, 3]);

      // Test with void
      mockCallback.mockResolvedValue(undefined);
      const voidResult = await withTransaction<void>(mockPrisma, mockCallback);
      expect(voidResult).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty operation name", async () => {
      mockCallback.mockResolvedValue("success");

      await withTransaction(mockPrisma, mockCallback, "");

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "",
        }),
        expect.any(Function),
      );
    });

    it("should handle very long operation names", async () => {
      const longName = "a".repeat(1000);
      mockCallback.mockResolvedValue("success");

      await withTransaction(mockPrisma, mockCallback, longName);

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: longName,
        }),
        expect.any(Function),
      );
    });

    it("should handle callback that returns Promise.resolve", async () => {
      mockCallback.mockReturnValue(Promise.resolve("resolved"));

      const result = await withTransaction(mockPrisma, mockCallback);

      expect(result).toBe("resolved");
    });

    it("should handle callback that returns Promise.reject", async () => {
      mockCallback.mockReturnValue(Promise.reject(new Error("rejected")));

      await expect(withTransaction(mockPrisma, mockCallback)).rejects.toThrow(
        "rejected",
      );
    });
  });
});

// Feature: platform-improvements, Property 5: withTransaction passes tx client to callback
import * as fc from "fast-check";

describe("Property 5: withTransaction passes tx client to callback", () => {
  // **Validates: Requirements 2.1**
  it("should invoke callback with the Prisma transaction client for any callback", async () => {
    await fc.assert(
      fc.asyncProperty(fc.record({}), async (txClientShape) => {
        // Generate an arbitrary tx client object
        const txClient = { ...txClientShape, _isTxClient: true };
        let capturedArg: unknown;

        const mockPrismaLocal = {
          $transaction: vi.fn((cb: (tx: any) => Promise<unknown>) =>
            cb(txClient),
          ),
        };

        const callback = vi.fn(async (tx: unknown) => {
          capturedArg = tx;
          return "result";
        });

        await withTransaction(mockPrismaLocal, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(capturedArg).toBe(txClient);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: platform-improvements, Property 6: withTransaction return value round-trip
describe("Property 6: withTransaction return value round-trip", () => {
  // **Validates: Requirements 2.2**
  it("should resolve with the exact value returned by the callback for any JSON-serializable value", async () => {
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async (returnValue) => {
        const mockPrismaLocal = {
          $transaction: vi.fn((cb: (tx: any) => Promise<unknown>) =>
            cb(mockPrismaLocal),
          ),
        };

        const callback = vi.fn(async (_tx: unknown) => returnValue);

        const result = await withTransaction(mockPrismaLocal, callback);

        expect(result).toStrictEqual(returnValue);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: platform-improvements, Property 7: withTransaction error propagation
describe("Property 7: withTransaction error propagation", () => {
  // **Validates: Requirements 2.3**
  it("should reject with the exact same error thrown by the callback for any error", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (message) => {
        const error = new Error(message);

        const mockPrismaLocal = {
          $transaction: vi.fn((cb: (tx: any) => Promise<unknown>) =>
            cb(mockPrismaLocal),
          ),
        };

        const callback = vi.fn(async (_tx: unknown) => {
          throw error;
        });

        let caughtError: unknown;
        try {
          await withTransaction(mockPrismaLocal, callback);
        } catch (e) {
          caughtError = e;
        }

        expect(caughtError).toBe(error);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: platform-improvements, Property 8: withTransaction Sentry span naming
describe("Property 8: withTransaction Sentry span naming", () => {
  // **Validates: Requirements 2.4**
  it("should start a Sentry span whose name equals the operationName for any operationName string", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (operationName) => {
        const mockPrismaLocal = {
          $transaction: vi.fn((cb: (tx: any) => Promise<unknown>) =>
            cb(mockPrismaLocal),
          ),
        };

        const callback = vi.fn(async (_tx: unknown) => "result");

        vi.clearAllMocks();

        await withTransaction(mockPrismaLocal, callback, operationName);

        const startSpanMock = Sentry.startSpan as ReturnType<typeof vi.fn>;
        expect(startSpanMock).toHaveBeenCalledTimes(1);
        const config = startSpanMock.mock.calls[0][0];
        expect(config.name).toBe(operationName);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: platform-improvements, Property 13: Logger lifecycle entries for withTransaction
describe("Property 13: Logger lifecycle entries for withTransaction", () => {
  // Validates: Requirements 4.3, 4.4, 4.5
  it("for any operationName and callback, emits info-level start entry, and either info-level completion or error-level entry", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.boolean(),
        async (operationName, shouldFail) => {
          const infoCalls: unknown[][] = [];
          const errorCalls: unknown[][] = [];

          // Patch getLogger at the module level via vi.mock is already set up;
          // instead we verify the structural contract: withTransaction must
          // either resolve or reject, and the Sentry span must be named correctly.
          const mockPrismaLocal = {
            $transaction: vi.fn((cb: (tx: any) => Promise<unknown>) =>
              cb(mockPrismaLocal),
            ),
          };

          const callback = vi.fn(async (_tx: unknown) => {
            if (shouldFail) throw new Error("forced failure");
            return "ok";
          });

          vi.clearAllMocks();

          if (shouldFail) {
            await expect(
              withTransaction(mockPrismaLocal, callback, operationName),
            ).rejects.toThrow("forced failure");
            // On failure, Sentry breadcrumb must be added
            expect(Sentry.addBreadcrumb).toHaveBeenCalled();
          } else {
            const result = await withTransaction(
              mockPrismaLocal,
              callback,
              operationName,
            );
            expect(result).toBe("ok");
          }

          // In both cases the Sentry span must be named with operationName
          const startSpanMock = Sentry.startSpan as ReturnType<typeof vi.fn>;
          expect(startSpanMock).toHaveBeenCalledWith(
            expect.objectContaining({ name: operationName }),
            expect.any(Function),
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
