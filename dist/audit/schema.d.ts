import { z } from "zod";
export declare const iso8601Regex: RegExp;
export declare const auditLogEntrySchema: z.ZodObject<{
    tenantId: z.ZodString;
    action: z.ZodString;
    actorId: z.ZodString;
    actorType: z.ZodEnum<{
        service: "service";
        user: "user";
    }>;
    timestamp: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    previousState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    newState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type AuditLogEntryInput = z.infer<typeof auditLogEntrySchema>;
