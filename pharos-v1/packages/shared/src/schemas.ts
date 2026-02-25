import { z } from "zod";

export const RoleSchema = z.enum(["OWNER", "SALES", "OPS", "VIEWER"]);
export const AlertTypeSchema = z.enum(["MAP", "MRP", "UNDERCUT", "DEAD_STOCK"]);
export const SeveritySchema = z.enum(["LOW", "MED", "HIGH"]);
export const AlertStatusSchema = z.enum(["OPEN", "ACK", "RESOLVED"]);
export const TaskStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "DONE"]);

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SkuCreateSchema = z.object({
  skuCode: z.string().min(1),
  name: z.string().min(1),
  mrp: z.number().nonnegative(),
  map: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  onHandQty: z.number().int().nonnegative(),
});

export const DealerCreateSchema = z.object({
  name: z.string().min(1),
  channel: z.string().min(1),
});

export const CompetitorCreateSchema = z.object({
  name: z.string().min(1),
});

export const SaleBulkSchema = z.object({
  rows: z.array(
    z.object({
      skuId: z.string().min(1),
      dealerId: z.string().min(1),
      soldPrice: z.number().positive(),
      qty: z.number().int().positive(),
      soldAt: z.coerce.date(),
      orderRef: z.string().min(1),
    }),
  ),
});

export const SnapshotBulkSchema = z.object({
  rows: z.array(
    z.object({
      competitorId: z.string().min(1),
      skuId: z.string().min(1),
      price: z.number().positive(),
      capturedAt: z.coerce.date(),
      url: z.string().url(),
    }),
  ),
});

export const TaskCreateSchema = z.object({
  alertId: z.string().optional(),
  title: z.string().min(1),
  slaDueAt: z.coerce.date(),
  assigneeUserId: z.string().optional(),
});

export type Role = z.infer<typeof RoleSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
