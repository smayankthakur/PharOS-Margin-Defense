import { AlertStatus, AlertType, prisma } from "@pharos/db";
import { deadStockValue, mapBreachImpact, mrpBreachImpact, severityFromImpact, undercutImpact } from "@pharos/shared";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function createAlertSafe(data: {
  tenantId: string;
  type: AlertType;
  skuId: string;
  dealerId?: string;
  competitorId?: string;
  impactAmount: number;
  evidenceJson: Record<string, unknown>;
  dedupeKey: string;
}) {
  try {
    await prisma.alert.create({
      data: {
        tenantId: data.tenantId,
        type: data.type,
        skuId: data.skuId,
        dealerId: data.dealerId,
        competitorId: data.competitorId,
        impactAmount: data.impactAmount,
        severity: severityFromImpact(data.impactAmount) as any,
        evidenceJson: data.evidenceJson as any,
        status: AlertStatus.OPEN,
        dedupeKey: data.dedupeKey,
      },
    });
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;
  }
}

async function detectMapMrp(tenantId: string) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sales = await prisma.saleRow.findMany({
    where: { tenantId, soldAt: { gte: cutoff } },
    orderBy: { soldAt: "desc" },
  });

  const skuIds = [...new Set(sales.map((row) => row.skuId))];
  const skus = await prisma.sku.findMany({ where: { tenantId, id: { in: skuIds } } });
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

  for (const sale of sales) {
    const sku = skuMap.get(sale.skuId);
    if (!sku) continue;

    const mapImpact = mapBreachImpact(sku.map, sale.soldPrice, sale.qty);
    if (mapImpact > 0) {
      await createAlertSafe({
        tenantId,
        type: AlertType.MAP,
        skuId: sale.skuId,
        dealerId: sale.dealerId,
        impactAmount: mapImpact,
        dedupeKey: `MAP:${sale.skuId}:${sale.dealerId}:${dateKey(sale.soldAt)}`,
        evidenceJson: {
          soldPrice: sale.soldPrice,
          map: sku.map,
          qty: sale.qty,
          soldAt: sale.soldAt,
          orderRef: sale.orderRef,
        },
      });
    }

    const mrpImpact = mrpBreachImpact(sku.mrp, sale.soldPrice, sale.qty);
    if (mrpImpact > 0) {
      await createAlertSafe({
        tenantId,
        type: AlertType.MRP,
        skuId: sale.skuId,
        dealerId: sale.dealerId,
        impactAmount: mrpImpact,
        dedupeKey: `MRP:${sale.skuId}:${sale.dealerId}:${dateKey(sale.soldAt)}`,
        evidenceJson: {
          soldPrice: sale.soldPrice,
          mrp: sku.mrp,
          qty: sale.qty,
          soldAt: sale.soldAt,
          orderRef: sale.orderRef,
        },
      });
    }
  }
}

async function detectUndercut(tenantId: string) {
  const snapshots = await prisma.competitorSnapshot.findMany({ where: { tenantId }, orderBy: { capturedAt: "desc" } });
  const skuIds = [...new Set(snapshots.map((row) => row.skuId))];
  const skus = await prisma.sku.findMany({ where: { tenantId, id: { in: skuIds } } });
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

  const latest = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    const key = `${snap.skuId}:${snap.competitorId}`;
    if (!latest.has(key)) latest.set(key, snap);
  }

  for (const snap of latest.values()) {
    const sku = skuMap.get(snap.skuId);
    if (!sku) continue;

    const impact = undercutImpact(sku.map, snap.price, 10);
    if (impact <= 0) continue;

    await createAlertSafe({
      tenantId,
      type: AlertType.UNDERCUT,
      skuId: snap.skuId,
      competitorId: snap.competitorId,
      impactAmount: impact,
      dedupeKey: `UNDERCUT:${snap.skuId}:${snap.competitorId}:${dateKey(snap.capturedAt)}`,
      evidenceJson: {
        competitorPrice: snap.price,
        map: sku.map,
        capturedAt: snap.capturedAt,
        snapshotUrl: snap.url,
      },
    });
  }
}

async function detectDeadStock(tenantId: string) {
  const skus = await prisma.sku.findMany({ where: { tenantId } });
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const today = dateKey(new Date());

  for (const sku of skus) {
    const latestSale = await prisma.saleRow.findFirst({
      where: { tenantId, skuId: sku.id },
      orderBy: { soldAt: "desc" },
    });

    const isDead = !latestSale || latestSale.soldAt < cutoff;
    if (!isDead) continue;

    const impact = deadStockValue(sku.cost, sku.onHandQty);
    await createAlertSafe({
      tenantId,
      type: AlertType.DEAD_STOCK,
      skuId: sku.id,
      impactAmount: impact,
      dedupeKey: `DEAD_STOCK:${sku.id}:${today}`,
      evidenceJson: {
        cost: sku.cost,
        onHandQty: sku.onHandQty,
        lastSaleAt: latestSale?.soldAt ?? null,
        cutoffDate: cutoff,
      },
    });
  }
}

async function runScan() {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const tenant of tenants) {
    await detectMapMrp(tenant.id);
    await detectUndercut(tenant.id);
    await detectDeadStock(tenant.id);
  }
  logger.info({ tenants: tenants.length }, "scan run completed");
}

async function bootstrap() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required for worker");
  }

  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue("alert-engine", { connection });

  await queue.add("scan", {}, { repeat: { every: 15 * 60 * 1000 }, jobId: "scan-15m" });

  const worker = new Worker(
    "alert-engine",
    async () => {
      await runScan();
    },
    { connection },
  );

  worker.on("completed", () => logger.info("worker completed job"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "worker failed job"));

  logger.info("worker started");
}

bootstrap().catch((error) => {
  logger.error({ error }, "worker startup failed");
  process.exit(1);
});
