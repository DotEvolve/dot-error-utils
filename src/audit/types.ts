export interface AuditLogEntry {
  // Required
  tenantId: string;
  action: string;
  actorId: string;
  actorType: "user" | "service";

  // Optional
  timestamp?: string; // Auto-generated as ISO-8601 if omitted
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
  batchSize?: number; // default: 50
  flushIntervalMs?: number; // default: 5000
}
