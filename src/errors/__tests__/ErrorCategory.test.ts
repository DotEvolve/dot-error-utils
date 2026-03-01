import { describe, it, expect } from "vitest";
import { ErrorCategory, ErrorCategoryType } from "../ErrorCategory";

describe("ErrorCategory", () => {
  it("should have all required categories", () => {
    expect(ErrorCategory.VALIDATION).toBe("validation");
    expect(ErrorCategory.AUTHENTICATION).toBe("authentication");
    expect(ErrorCategory.AUTHORIZATION).toBe("authorization");
    expect(ErrorCategory.CONFLICT).toBe("conflict");
    expect(ErrorCategory.NOT_FOUND).toBe("not_found");
    expect(ErrorCategory.SYSTEM).toBe("system");
  });

  it("should be immutable", () => {
    expect(() => {
      // @ts-expect-error Testing immutability
      ErrorCategory.VALIDATION = "modified";
    }).toThrow();
  });

  it("should have correct type", () => {
    const category: ErrorCategoryType = ErrorCategory.VALIDATION;
    expect(category).toBe("validation");
  });

  it("should contain exactly 6 categories", () => {
    const categories = Object.keys(ErrorCategory);
    expect(categories).toHaveLength(6);
  });
});
