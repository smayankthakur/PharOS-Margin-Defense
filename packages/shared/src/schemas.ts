import { z } from "zod";

export const RoleSchema = z.enum(["OWNER", "SALES", "OPS", "VIEWER"]);
export const AlertTypeSchema = z.enum(["MAP", "MRP", "UNDERCUT", "DEAD_STOCK"]);
export const SeveritySchema = z.enum(["LOW", "MED", "HIGH"]);
export const AlertStatusSchema = z.enum(["OPEN", "ACK", "RESOLVED"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SkuSchema = z.object({
  skuCode: z.string().min(1),
  name: z.string().min(1),
  mrp: z.number().nonnegative(),
  map: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  onHandQty: z.number().int().nonnegative().default(0),
});

export const DealerSchema = z.object({
  name: z.string().min(1),
  channel: z.string().min(1),
});

export const SaleRowSchema = z.object({
  skuId: z.string().min(1),
  dealerId: z.string().min(1),
  soldPrice: z.number().positive(),
  qty: z.number().int().positive(),
  soldAt: z.coerce.date(),
  orderRef: z.string().min(1),
});

export const SaleBulkSchema = z.object({
  rows: z.array(SaleRowSchema).min(1),
});

export const CompetitorSnapshotSchema = z.object({
  competitorId: z.string().min(1),
  skuId: z.string().min(1),
  price: z.number().positive(),
  capturedAt: z.coerce.date(),
  url: z.string().url(),
});

export const SnapshotBulkSchema = z.object({
  rows: z.array(CompetitorSnapshotSchema).min(1),
});

export const TaskSchema = z.object({
  alertId: z.string().optional(),
  title: z.string().min(1),
  slaDueAt: z.coerce.date().optional(),
  assigneeUserId: z.string().optional(),
});
