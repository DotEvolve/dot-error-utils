export interface AuditLogEntry {
    tenantId: string;
    action: string;
    actorId: string;
    actorType: "user" | "service";
    timestamp?: string;
    entityId?: string;
    entityType?: string;
    ipAddress?: string;
    details?: Record<string, unknown>;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
}
export type AuditTransport = (batch: AuditLogEntry[]) => Promise<void>;
export interface AuditLoggerConfig {
    transport: AuditTransport;
    batchSize?: number;
    flushIntervalMs?: number;
}
