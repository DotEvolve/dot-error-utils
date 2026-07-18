import { z } from "zod";
import type { AuditLogEntry } from "./types";

export const iso8601Regex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export const auditLogEntrySchema = z.object({
  tenantId: z.string().uuid(),
  action: z.string().min(1),
  actorId: z.string().min(1),
  actorType: z.enum(["user", "service"]),
  timestamp: z.string().regex(iso8601Regex, "Must be ISO-8601").optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  ipAddress: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  previousState: z.record(z.string(), z.unknown()).optional(),
  newState: z.record(z.string(), z.unknown()).optional(),
});

export type AuditLogEntryInput = z.infer<typeof auditLogEntrySchema>;
