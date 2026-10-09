"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = exports.ValidationError = void 0;
exports.serializeEntry = serializeEntry;
exports.deserializeEntry = deserializeEntry;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
class AuditLogger {
    constructor(config) {
        this.queue = [];
        this.isShutdown = false;
        if (!config.transport) {
            throw new ValidationError("transport is required");
        }
        this.batchSize = config.batchSize ?? 50;
        if (this.batchSize < 1) {
            throw new ValidationError("batchSize must be at least 1");
        }
        this.flushIntervalMs = config.flushIntervalMs ?? 5000;
        if (this.flushIntervalMs < 100) {
            throw new ValidationError("flushIntervalMs must be at least 100");
        }
        this.transport = config.transport;
        // Set up the interval timer
        this.intervalId = setInterval(() => {
            this.timerFlush();
        }, this.flushIntervalMs);
    }
    timerFlush() {
        if (this.queue.length > 0) {
            this.flush().catch(() => {
                // flush internally handles its own transport failures
            });
        }
    }
    // Implemented Task 2.2
    track(event) {
        if (this.isShutdown) {
            console.warn("AuditLogger: track() called after shutdown(), event discarded.");
            return;
        }
        if (!event.tenantId ||
            !event.action ||
            !event.actorId ||
            !event.actorType) {
            console.warn("AuditLogger: event missing required fields (tenantId, action, actorId, actorType), event discarded.");
            return;
        }
        if (event.actorType !== "user" && event.actorType !== "service") {
            console.warn('AuditLogger: invalid actorType (must be "user" or "service"), event discarded.');
            return;
        }
        if (event.timestamp) {
            // Validate ISO-8601
            const date = new Date(event.timestamp);
            if (Number.isNaN(date.getTime()) ||
                event.timestamp !== date.toISOString()) {
                console.warn("AuditLogger: invalid timestamp (must be ISO-8601), event discarded.");
                return;
            }
        }
        else {
            event.timestamp = new Date().toISOString();
        }
        this.queue.push(event);
        if (this.queue.length >= this.batchSize) {
            this.flush().catch(() => {
                // flush internally handles its own transport failures
            });
        }
    }
    // Implemented Task 2.3
    async flush() {
        if (this.queue.length === 0) {
            return;
        }
        const batch = [...this.queue];
        this.queue = [];
        try {
            await this.transport(batch);
        }
        catch (error) {
            console.warn("AuditLogger: transport rejected, batch discarded.", error);
        }
    }
    // Implemented Task 2.3
    async shutdown() {
        this.isShutdown = true;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        await this.flush();
    }
}
exports.AuditLogger = AuditLogger;
// Implemented Task 2.4
function serializeEntry(entry) {
    return JSON.stringify(entry);
}
// Implemented Task 2.4
function deserializeEntry(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        throw new ValidationError("Invalid JSON");
    }
    if (!parsed || typeof parsed !== "object") {
        throw new ValidationError("Entry must be an object");
    }
    if (!parsed.tenantId ||
        !parsed.action ||
        !parsed.actorId ||
        !parsed.actorType) {
        throw new ValidationError("Missing required fields: tenantId, action, actorId, actorType");
    }
    return parsed;
}
