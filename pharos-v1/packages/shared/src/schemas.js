"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCreateSchema = exports.SnapshotBulkSchema = exports.SaleBulkSchema = exports.CompetitorCreateSchema = exports.DealerCreateSchema = exports.SkuCreateSchema = exports.LoginSchema = exports.TaskStatusSchema = exports.AlertStatusSchema = exports.SeveritySchema = exports.AlertTypeSchema = exports.RoleSchema = void 0;
const zod_1 = require("zod");
exports.RoleSchema = zod_1.z.enum(["OWNER", "SALES", "OPS", "VIEWER"]);
exports.AlertTypeSchema = zod_1.z.enum(["MAP", "MRP", "UNDERCUT", "DEAD_STOCK"]);
exports.SeveritySchema = zod_1.z.enum(["LOW", "MED", "HIGH"]);
exports.AlertStatusSchema = zod_1.z.enum(["OPEN", "ACK", "RESOLVED"]);
exports.TaskStatusSchema = zod_1.z.enum(["OPEN", "IN_PROGRESS", "DONE"]);
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
exports.SkuCreateSchema = zod_1.z.object({
    skuCode: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    mrp: zod_1.z.number().nonnegative(),
    map: zod_1.z.number().nonnegative(),
    cost: zod_1.z.number().nonnegative(),
    onHandQty: zod_1.z.number().int().nonnegative(),
});
exports.DealerCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    channel: zod_1.z.string().min(1),
});
exports.CompetitorCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
});
exports.SaleBulkSchema = zod_1.z.object({
    rows: zod_1.z.array(zod_1.z.object({
        skuId: zod_1.z.string().min(1),
        dealerId: zod_1.z.string().min(1),
        soldPrice: zod_1.z.number().positive(),
        qty: zod_1.z.number().int().positive(),
        soldAt: zod_1.z.coerce.date(),
        orderRef: zod_1.z.string().min(1),
    })),
});
exports.SnapshotBulkSchema = zod_1.z.object({
    rows: zod_1.z.array(zod_1.z.object({
        competitorId: zod_1.z.string().min(1),
        skuId: zod_1.z.string().min(1),
        price: zod_1.z.number().positive(),
        capturedAt: zod_1.z.coerce.date(),
        url: zod_1.z.string().url(),
    })),
});
exports.TaskCreateSchema = zod_1.z.object({
    alertId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1),
    slaDueAt: zod_1.z.coerce.date(),
    assigneeUserId: zod_1.z.string().optional(),
});
