"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogEntrySchema = exports.iso8601Regex = void 0;
const zod_1 = require("zod");
exports.iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
exports.auditLogEntrySchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    action: zod_1.z.string().min(1),
    actorId: zod_1.z.string().min(1),
    actorType: zod_1.z.enum(["user", "service"]),
    timestamp: zod_1.z.string().regex(exports.iso8601Regex, "Must be ISO-8601").optional(),
    entityId: zod_1.z.string().optional(),
    entityType: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    previousState: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    newState: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
