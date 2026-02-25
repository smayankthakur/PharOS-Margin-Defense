import { AlertType, Prisma, prisma } from "@pharos/db";
import {
  deadStockValue,
  mapBreachImpact,
  mrpBreachImpact,
  severityFromImpact,
  undercutImpact,
} from "@pharos/shared";
import { yyyyMmDd } from "./utils";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function generateAlertsForTenant(tenantId: string): Promise<number> {
  let created = 0;
  const now = new Date();
  const salesCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sales = await prisma.saleRow.findMany({
    where: { tenantId, soldAt: { gte: salesCutoff } },
    include: { sku: true },
  });

  for (const sale of sales) {
    const mapImpact = mapBreachImpact(sale.sku.map, sale.soldPrice, sale.qty);
    if (mapImpact > 0) {
      try {
        await prisma.alert.create({
          data: {
            tenantId,
            type: AlertType.MAP,
            skuId: sale.skuId,
            dealerId: sale.dealerId,
            severity: severityFromImpact(mapImpact),
            impactAmount: mapImpact,
            status: "OPEN",
            dedupeKey: `MAP:${sale.skuId}:${sale.dealerId}:${yyyyMmDd(sale.soldAt)}`,
            evidenceJson: {
              soldPrice: sale.soldPrice,
              map: sale.sku.map,
              qty: sale.qty,
              soldAt: sale.soldAt,
              orderRef: sale.orderRef,
            },
          },
        });
        created += 1;
      } catch (error: unknown) {
        if (!isUniqueViolation(error)) throw error;
      }
    }

    const mrpImpact = mrpBreachImpact(sale.sku.mrp, sale.soldPrice, sale.qty);
    if (mrpImpact > 0) {
      try {
        await prisma.alert.create({
          data: {
            tenantId,
            type: AlertType.MRP,
            skuId: sale.skuId,
            dealerId: sale.dealerId,
            severity: severityFromImpact(mrpImpact),
            impactAmount: mrpImpact,
            status: "OPEN",
            dedupeKey: `MRP:${sale.skuId}:${sale.dealerId}:${yyyyMmDd(sale.soldAt)}`,
            evidenceJson: {
              soldPrice: sale.soldPrice,
              mrp: sale.sku.mrp,
              qty: sale.qty,
              soldAt: sale.soldAt,
              orderRef: sale.orderRef,
            },
          },
        });
        created += 1;
      } catch (error: unknown) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
  }

  const snapshots = await prisma.competitorSnapshot.findMany({
    where: { tenantId },
    include: { sku: true },
    orderBy: { capturedAt: "desc" },
  });
  const latest = new Map<string, (typeof snapshots)[number]>();
  for (const row of snapshots) {
    const key = `${row.skuId}:${row.competitorId}`;
    if (!latest.has(key)) latest.set(key, row);
  }

  for (const row of latest.values()) {
    const impact = undercutImpact(row.sku.map, row.price, 10);
    if (impact <= 0) continue;
    try {
      await prisma.alert.create({
        data: {
          tenantId,
          type: AlertType.UNDERCUT,
          skuId: row.skuId,
          competitorId: row.competitorId,
          severity: severityFromImpact(impact),
          impactAmount: impact,
          status: "OPEN",
          dedupeKey: `UNDERCUT:${row.skuId}:${row.competitorId}:${yyyyMmDd(row.capturedAt)}`,
          evidenceJson: {
            competitorPrice: row.price,
            map: row.sku.map,
            capturedAt: row.capturedAt,
            url: row.url,
          },
        },
      });
      created += 1;
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  const skus = await prisma.sku.findMany({ where: { tenantId } });
  const deadCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  for (const sku of skus) {
    const lastSale = await prisma.saleRow.findFirst({
      where: { tenantId, skuId: sku.id },
      orderBy: { soldAt: "desc" },
    });

    if (!lastSale || lastSale.soldAt < deadCutoff) {
      const impact = deadStockValue(sku.cost, sku.onHandQty);
      try {
        await prisma.alert.create({
          data: {
            tenantId,
            type: AlertType.DEAD_STOCK,
            skuId: sku.id,
            severity: severityFromImpact(impact),
            impactAmount: impact,
            status: "OPEN",
            dedupeKey: `DEAD_STOCK:${sku.id}:${yyyyMmDd(now)}`,
            evidenceJson: {
              cost: sku.cost,
              onHandQty: sku.onHandQty,
              lastSaleAt: lastSale?.soldAt ?? null,
              thresholdDays: 90,
            },
          },
        });
        created += 1;
      } catch (error: unknown) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
  }

  return created;
}
