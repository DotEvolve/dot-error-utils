import { AuditLogEntry, AuditLoggerConfig } from "./types";
export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class AuditLogger {
    private transport;
    private batchSize;
    private flushIntervalMs;
    private queue;
    private isShutdown;
    private intervalId?;
    constructor(config: AuditLoggerConfig);
    private timerFlush;
    track(event: AuditLogEntry): void;
    flush(): Promise<void>;
    shutdown(): Promise<void>;
}
export declare function serializeEntry(entry: AuditLogEntry): string;
export declare function deserializeEntry(raw: string): AuditLogEntry;
