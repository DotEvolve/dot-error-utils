import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AuditLogger,
  ValidationError,
  deserializeEntry,
  serializeEntry,
} from "../AuditLogger";
import { AuditLogEntry, AuditTransport } from "../types";

describe("AuditLogger Unit Tests", () => {
  let mockTransport: ReturnType<typeof vi.fn>;
  let logger: AuditLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    mockTransport = vi.fn().mockResolvedValue(undefined);
    logger = new AuditLogger({
      transport: mockTransport as AuditTransport,
      batchSize: 3,
      flushIntervalMs: 1000,
    });
  });

  afterEach(async () => {
    await logger.shutdown();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Constructor Validation", () => {
    it("throws ValidationError for missing transport", () => {
      expect(() => new AuditLogger({} as any)).toThrow(ValidationError);
    });

    it("throws ValidationError when batchSize < 1", () => {
      expect(
        () => new AuditLogger({ transport: mockTransport, batchSize: 0 }),
      ).toThrow(ValidationError);
      expect(
        () => new AuditLogger({ transport: mockTransport, batchSize: -1 }),
      ).toThrow(ValidationError);
    });

    it("throws ValidationError when flushIntervalMs < 100", () => {
      expect(
        () =>
          new AuditLogger({ transport: mockTransport, flushIntervalMs: 99 }),
      ).toThrow(ValidationError);
    });
  });

  describe("track() validation", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    it("discards event with missing required fields", () => {
      logger.track({
        tenantId: "t1",
        actorId: "a1",
        actorType: "user",
      } as AuditLogEntry); // missing action
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("missing required fields"),
      );
      expect(mockTransport).not.toHaveBeenCalled();
    });

    it("discards event with invalid actorType", () => {
      logger.track({
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "invalid" as any,
      });
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("invalid actorType"),
      );
    });

    it("discards event with invalid timestamp string", () => {
      logger.track({
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "user",
        timestamp: "not-a-date",
      });
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("invalid timestamp"),
      );
    });

    it("auto-generates ISO-8601 timestamp if missing", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      logger.track({
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "user",
      });
      await logger.flush();
      expect(mockTransport).toHaveBeenCalledWith([
        {
          tenantId: "t1",
          action: "a",
          actorId: "a1",
          actorType: "user",
          timestamp: "2026-01-01T00:00:00.000Z",
        },
      ]);
    });
  });

  describe("Flushing Behavior", () => {
    it("flushes when batchSize is reached", () => {
      const e = {
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "user" as const,
      };
      logger.track(e);
      logger.track(e);
      expect(mockTransport).not.toHaveBeenCalled();

      logger.track(e); // 3rd event, should flush
      expect(mockTransport).toHaveBeenCalledTimes(1);
      expect(mockTransport).toHaveBeenCalledWith([
        expect.objectContaining(e),
        expect.objectContaining(e),
        expect.objectContaining(e),
      ]);
    });

    it("flushes on interval if queue is not empty", () => {
      const e = {
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "user" as const,
      };
      logger.track(e);
      expect(mockTransport).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockTransport).toHaveBeenCalledTimes(1);
    });

    it("does not flush on interval if queue is empty", () => {
      vi.advanceTimersByTime(1000);
      expect(mockTransport).not.toHaveBeenCalled();
    });

    it("handles transport rejection without crashing", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      mockTransport.mockRejectedValueOnce(new Error("Network error"));

      const e = {
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "user" as const,
      };
      logger.track(e);
      await logger.flush(); // Should not throw
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("transport rejected"),
        expect.any(Error),
      );
    });

    it("flush() resolves immediately on empty queue", async () => {
      await logger.flush();
      expect(mockTransport).not.toHaveBeenCalled();
    });
  });

  describe("shutdown()", () => {
    it("flushes remaining events and prevents future tracks", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const e = {
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "user" as const,
      };

      logger.track(e);
      await logger.shutdown();
      expect(mockTransport).toHaveBeenCalledTimes(1); // from shutdown flush

      // Future tracks discarded
      logger.track(e);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("called after shutdown"),
      );

      await logger.flush();
      expect(mockTransport).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe("Serialization & Deserialization", () => {
    it("deserializes valid JSON", () => {
      const e: AuditLogEntry = {
        tenantId: "t1",
        action: "a",
        actorId: "a1",
        actorType: "user",
      };
      const raw = JSON.stringify(e);
      expect(deserializeEntry(raw)).toEqual(e);
    });

    it("throws ValidationError for non-JSON", () => {
      expect(() => deserializeEntry("invalid")).toThrow(ValidationError);
    });

    it("throws ValidationError for JSON missing required fields", () => {
      expect(() =>
        deserializeEntry(JSON.stringify({ tenantId: "t1" })),
      ).toThrow(ValidationError);
    });
  });
});
