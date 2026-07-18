import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { PINO_TO_SENTRY_LEVEL } from "../logger/index";

// Property 8: Pino level to Sentry level mapping is exhaustive
// Validates: Requirements 1.6
describe("Pino level to Sentry level mapping", () => {
  it("maps valid Pino levels to valid Sentry SeverityLevels", () => {
    const validLevels = [10, 20, 30, 40, 50, 60];
    const validSentryLevels = ["fatal", "error", "warning", "info", "debug"];

    fc.assert(
      fc.property(fc.constantFrom(...validLevels), (level) => {
        const sentryLevel = PINO_TO_SENTRY_LEVEL[level];
        expect(validSentryLevels).toContain(sentryLevel);
      }),
      { numRuns: 100 },
    );
  });
});
