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
