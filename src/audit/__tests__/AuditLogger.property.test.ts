import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AuditLogger, deserializeEntry, serializeEntry } from "../AuditLogger";
import { AuditLogEntry, AuditTransport } from "../types";

const auditLogEntryArb = fc.record({
  tenantId: fc.uuid(),
  action: fc.string({ minLength: 1 }),
  actorId: fc.string({ minLength: 1 }),
  actorType: fc.constantFrom("user", "service") as fc.Arbitrary<
    "user" | "service"
  >,
  timestamp: fc
    .date()
    .filter((d) => !Number.isNaN(d.getTime()))
    .map((d) => d.toISOString()),
  entityId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  entityType: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
  details: fc.option(fc.dictionary(fc.string(), fc.anything()), {
    nil: undefined,
  }),
  previousState: fc.option(fc.dictionary(fc.string(), fc.anything()), {
    nil: undefined,
  }),
  newState: fc.option(fc.dictionary(fc.string(), fc.anything()), {
    nil: undefined,
  }),
});

describe("AuditLogger Property Tests", () => {
  // Property 1: Serialization round-trip
  it("Property 1: For any valid AuditLogEntry, deserializeEntry(serializeEntry(entry)) deeply equals the original entry", () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const normalizedEntry = JSON.parse(JSON.stringify(entry));
        expect(deserializeEntry(serializeEntry(entry))).toEqual(
          normalizedEntry,
        );
      }),
      { numRuns: 100 },
    );
  });

  // Property 2: No event loss or duplication across batches
  it("Property 2: For any ordered sequence of valid events passed to track(), transport batches concatenate to the original sequence", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(auditLogEntryArb),
        fc.integer({ min: 1, max: 100 }),
        async (events, batchSize) => {
          const received: AuditLogEntry[] = [];
          const transport: AuditTransport = async (batch) => {
            received.push(...batch);
          };

          const logger = new AuditLogger({
            transport,
            batchSize,
            flushIntervalMs: 100000,
          });
          for (const e of events) {
            logger.track(e);
          }
          await logger.shutdown();

          expect(received).toEqual(events);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property 3: Invalid events are silently discarded
  it("Property 3: Invalid events do not throw and are not delivered", async () => {
    const invalidEntryArb = fc.record({
      tenantId: fc.uuid(),
      action: fc.string({ minLength: 1 }),
      actorId: fc.string({ minLength: 1 }),
      actorType: fc
        .string()
        .filter((s) => s !== "user" && s !== "service") as any, // Invalid actorType
    });

    await fc.assert(
      fc.asyncProperty(invalidEntryArb, async (invalidEvent) => {
        let called = false;
        const transport: AuditTransport = async () => {
          called = true;
        };

        const logger = new AuditLogger({
          transport,
          batchSize: 1,
          flushIntervalMs: 100000,
        });

        // Suppress warnings in test output
        const originalWarn = console.warn;
        console.warn = () => {};

        expect(() => logger.track(invalidEvent)).not.toThrow();
        await logger.shutdown();

        console.warn = originalWarn;
        expect(called).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // Property 4: Size-triggered flush delivers exactly one transport call per full batch
  it("Property 4: For any batchSize, exactly batchSize events trigger exactly one transport call", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 1, max: 50 })
          .chain((batchSize) =>
            fc.tuple(
              fc.constant(batchSize),
              fc.array(auditLogEntryArb, {
                minLength: batchSize,
                maxLength: batchSize,
              }),
            ),
          ),
        async ([batchSize, events]) => {
          let callCount = 0;
          let receivedBatch: AuditLogEntry[] = [];
          const transport: AuditTransport = async (batch) => {
            callCount++;
            receivedBatch = batch;
          };

          const logger = new AuditLogger({
            transport,
            batchSize,
            flushIntervalMs: 100000,
          });
          for (const e of events) {
            logger.track(e);
          }

          expect(callCount).toBe(1);
          expect(receivedBatch).toEqual(events);
          await logger.shutdown(); // ensure cleanup
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property 5: Post-shutdown events never reach transport
  it("Property 5: Post-shutdown events never reach transport", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(auditLogEntryArb, { minLength: 1 }),
        async (events) => {
          let callCount = 0;
          const transport: AuditTransport = async () => {
            callCount++;
          };

          const logger = new AuditLogger({
            transport,
            batchSize: 1,
            flushIntervalMs: 100000,
          });
          await logger.shutdown();

          const originalWarn = console.warn;
          console.warn = () => {};

          for (const e of events) {
            logger.track(e);
          }

          console.warn = originalWarn;
          expect(callCount).toBe(0); // shutdown() flushes empty queue, which doesn't call transport
        },
      ),
      { numRuns: 100 },
    );
  });
});
