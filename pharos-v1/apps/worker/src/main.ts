import "dotenv/config";

import { AlertType, Prisma, prisma } from "@pharos/db";
import {
  deadStockValue,
  mapBreachImpact,
  mrpBreachImpact,
  severityFromImpact,
  undercutImpact,
} from "@pharos/shared";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function tryCreateAlert(payload: {
  tenantId: string;
  type: "MAP" | "MRP" | "UNDERCUT" | "DEAD_STOCK";
  skuId: string;
  dealerId?: string;
  competitorId?: string;
  impactAmount: number;
  dedupeKey: string;
  evidenceJson: Record<string, unknown>;
}): Promise<void> {
  try {
    const evidenceJson = payload.evidenceJson as Prisma.InputJsonObject;
    await prisma.alert.create({
      data: {
        tenantId: payload.tenantId,
        type: payload.type,
        skuId: payload.skuId,
        dealerId: payload.dealerId ?? null,
        competitorId: payload.competitorId ?? null,
        impactAmount: payload.impactAmount,
        severity: severityFromImpact(payload.impactAmount),
        status: "OPEN",
        dedupeKey: payload.dedupeKey,
        evidenceJson,
      },
    });
  } catch (error: unknown) {
    if (!isUniqueViolation(error)) throw error;
  }
}

async function runForTenant(tenantId: string): Promise<void> {
  const now = new Date();
  const salesSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sales = await prisma.saleRow.findMany({
    where: { tenantId, soldAt: { gte: salesSince } },
    include: { sku: true },
  });

  for (const s of sales) {
    const mapImpact = mapBreachImpact(s.sku.map, s.soldPrice, s.qty);
    if (mapImpact > 0) {
      await tryCreateAlert({
        tenantId,
        type: AlertType.MAP,
        skuId: s.skuId,
        dealerId: s.dealerId,
        impactAmount: mapImpact,
        dedupeKey: `MAP:${s.skuId}:${s.dealerId}:${dayKey(s.soldAt)}`,
        evidenceJson: {
          soldPrice: s.soldPrice,
          map: s.sku.map,
          qty: s.qty,
          soldAt: s.soldAt,
          orderRef: s.orderRef,
          skuId: s.skuId,
          dealerId: s.dealerId,
        },
      });
    }

    const mrpImpact = mrpBreachImpact(s.sku.mrp, s.soldPrice, s.qty);
    if (mrpImpact > 0) {
      await tryCreateAlert({
        tenantId,
        type: AlertType.MRP,
        skuId: s.skuId,
        dealerId: s.dealerId,
        impactAmount: mrpImpact,
        dedupeKey: `MRP:${s.skuId}:${s.dealerId}:${dayKey(s.soldAt)}`,
        evidenceJson: {
          soldPrice: s.soldPrice,
          mrp: s.sku.mrp,
          qty: s.qty,
          soldAt: s.soldAt,
          orderRef: s.orderRef,
          skuId: s.skuId,
          dealerId: s.dealerId,
        },
      });
    }
  }

  const snapshots = await prisma.competitorSnapshot.findMany({
    where: { tenantId },
    include: { sku: true },
    orderBy: { capturedAt: "desc" },
  });
  const latest = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    const key = `${snap.skuId}:${snap.competitorId}`;
    if (!latest.has(key)) latest.set(key, snap);
  }

  for (const snap of latest.values()) {
    const impact = undercutImpact(snap.sku.map, snap.price, 10);
    if (impact <= 0) continue;
    await tryCreateAlert({
      tenantId,
      type: AlertType.UNDERCUT,
      skuId: snap.skuId,
      competitorId: snap.competitorId,
      impactAmount: impact,
      dedupeKey: `UNDERCUT:${snap.skuId}:${snap.competitorId}:${dayKey(snap.capturedAt)}`,
      evidenceJson: {
        targetPrice: snap.sku.map,
        competitorPrice: snap.price,
        capturedAt: snap.capturedAt,
        competitorId: snap.competitorId,
        skuId: snap.skuId,
        url: snap.url,
      },
    });
  }

  const deadCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const skus = await prisma.sku.findMany({ where: { tenantId } });
  for (const sku of skus) {
    const lastSale = await prisma.saleRow.findFirst({
      where: { tenantId, skuId: sku.id },
      orderBy: { soldAt: "desc" },
    });

    if (!lastSale || lastSale.soldAt < deadCutoff) {
      const impact = deadStockValue(sku.cost, sku.onHandQty);
      await tryCreateAlert({
        tenantId,
        type: AlertType.DEAD_STOCK,
        skuId: sku.id,
        impactAmount: impact,
        dedupeKey: `DEAD_STOCK:${sku.id}:${dayKey(now)}`,
        evidenceJson: {
          skuId: sku.id,
          cost: sku.cost,
          onHandQty: sku.onHandQty,
          lastSaleAt: lastSale?.soldAt ?? null,
          checkedAt: now,
        },
      });
    }
  }
}

async function runScan(): Promise<void> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const t of tenants) {
    await runForTenant(t.id);
  }
  logger.info({ tenants: tenants.length }, "scan complete");
}

async function start(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn("REDIS_URL missing: local fallback interval enabled");
    await runScan();
    setInterval(() => {
      void runScan();
    }, 15 * 60 * 1000);
    return;
  }

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue("pharos-alerts", { connection });
  await queue.upsertJobScheduler(
    "scan-15m",
    { pattern: "*/15 * * * *" },
    { name: "scan", data: {} },
  );

  const worker = new Worker(
    "pharos-alerts",
    async () => {
      await runScan();
    },
    { connection },
  );

  worker.on("failed", (_job, err) => logger.error({ err }, "worker job failed"));
  worker.on("completed", () => logger.info("worker job completed"));

  logger.info("worker started");
}

void start();
