// Feature: platform-improvements, Property 11: Logger emits valid JSON
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { Writable } from "stream";
import pino from "pino";

// Helper: create a pino logger that writes to an in-memory buffer
function makeTestLogger(serviceName: string) {
  const lines: string[] = [];
  const dest = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString().trim());
      cb();
    },
  });
  const logger = pino(
    {
      level: "debug",
      base: { service: serviceName },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    dest,
  );
  return { logger, lines };
}

describe("createLogger / getLogger", () => {
  describe("unit tests", () => {
    it("emits a JSON line for debug level", () => {
      const { logger, lines } = makeTestLogger("test-svc");
      logger.debug("hello debug");
      expect(lines.length).toBeGreaterThan(0);
      const parsed = JSON.parse(lines[0]);
      expect(parsed.msg).toBe("hello debug");
      expect(parsed.service).toBe("test-svc");
    });

    it("emits a JSON line for info level", () => {
      const { logger, lines } = makeTestLogger("test-svc");
      logger.info("hello info");
      const parsed = JSON.parse(lines[0]);
      expect(parsed.msg).toBe("hello info");
    });

    it("emits a JSON line for error level", () => {
      const { logger, lines } = makeTestLogger("test-svc");
      logger.error("hello error");
      const parsed = JSON.parse(lines[0]);
      expect(parsed.msg).toBe("hello error");
    });

    it("includes time field in ISO format", () => {
      const { logger, lines } = makeTestLogger("test-svc");
      logger.info("ts test");
      const parsed = JSON.parse(lines[0]);
      expect(typeof parsed.time).toBe("string");
      expect(() => new Date(parsed.time)).not.toThrow();
    });

    it("includes level field", () => {
      const { logger, lines } = makeTestLogger("test-svc");
      logger.info("level test");
      const parsed = JSON.parse(lines[0]);
      expect(parsed.level).toBeDefined();
    });
  });

  describe("Property 11: Logger emits valid JSON", () => {
    it("for any log call (debug, info, error), output is parseable JSON containing level, msg, time, and service fields", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("debug", "info", "error") as fc.Arbitrary<
            "debug" | "info" | "error"
          >,
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (level, message, serviceName) => {
            const { logger, lines } = makeTestLogger(serviceName);
            logger[level](message);

            expect(lines.length).toBeGreaterThan(0);

            // Must be parseable JSON
            let parsed: Record<string, unknown>;
            expect(() => {
              parsed = JSON.parse(lines[0]);
            }).not.toThrow();

            parsed = JSON.parse(lines[0]);

            // Required fields
            expect(parsed).toHaveProperty("level");
            expect(parsed).toHaveProperty("msg", message);
            expect(parsed).toHaveProperty("time");
            expect(parsed).toHaveProperty("service", serviceName);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
