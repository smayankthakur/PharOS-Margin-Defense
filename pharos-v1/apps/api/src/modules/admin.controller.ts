import { BadRequestException, Controller, Headers, Post, Query } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import argon2 from "argon2";
import { generateAlertsForTenant } from "./alert-engine";

@Controller("admin")
export class AdminController {
  @Post("seed")
  async seedDemo(@Query("demo") demo: string, @Headers("x-admin-seed-token") token?: string) {
    if (demo !== "true") {
      throw new BadRequestException("Only demo=true is supported");
    }
    if (!process.env.ADMIN_SEED_TOKEN || token !== process.env.ADMIN_SEED_TOKEN) {
      throw new BadRequestException("Invalid admin seed token");
    }

    const tenant = await prisma.tenant.upsert({
      where: { slug: "demo-tenant" },
      update: { name: "PharOS Demo Tenant" },
      create: { slug: "demo-tenant", name: "PharOS Demo Tenant" },
    });

    const passHash = await argon2.hash("password123");
    const users = [
      { email: "owner@demo.pharos", role: Role.OWNER },
      { email: "ops@demo.pharos", role: Role.OPS },
      { email: "sales@demo.pharos", role: Role.SALES },
      { email: "viewer@demo.pharos", role: Role.VIEWER },
    ];
    for (const user of users) {
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: user.email } },
        update: { passwordHash: passHash, role: user.role },
        create: { tenantId: tenant.id, email: user.email, role: user.role, passwordHash: passHash },
      });
    }

    await prisma.task.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.alert.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.competitorSnapshot.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.saleRow.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.competitor.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.dealer.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.sku.deleteMany({ where: { tenantId: tenant.id } });

    const sku1 = await prisma.sku.create({ data: { tenantId: tenant.id, skuCode: "SKU-001", name: "Mask A", mrp: 120, map: 100, cost: 72, onHandQty: 130 } });
    const sku2 = await prisma.sku.create({ data: { tenantId: tenant.id, skuCode: "SKU-002", name: "Gloves B", mrp: 340, map: 300, cost: 210, onHandQty: 85 } });
    const sku3 = await prisma.sku.create({ data: { tenantId: tenant.id, skuCode: "SKU-003", name: "Oximeter C", mrp: 1800, map: 1600, cost: 1220, onHandQty: 40 } });

    const dealer1 = await prisma.dealer.create({ data: { tenantId: tenant.id, name: "MediKart", channel: "B2B" } });
    const dealer2 = await prisma.dealer.create({ data: { tenantId: tenant.id, name: "HealthHub", channel: "Retail" } });
    const competitor = await prisma.competitor.create({ data: { tenantId: tenant.id, name: "RivalMed" } });

    const now = new Date();
    const sales: Array<{ skuId: string; dealerId: string; soldPrice: number; qty: number; dayOffset: number; orderRef: string }> = [
      { skuId: sku1.id, dealerId: dealer1.id, soldPrice: 95, qty: 4, dayOffset: 1, orderRef: "SO-1" },
      { skuId: sku1.id, dealerId: dealer2.id, soldPrice: 99, qty: 3, dayOffset: 2, orderRef: "SO-2" },
      { skuId: sku1.id, dealerId: dealer1.id, soldPrice: 110, qty: 2, dayOffset: 3, orderRef: "SO-3" },
      { skuId: sku1.id, dealerId: dealer2.id, soldPrice: 88, qty: 5, dayOffset: 4, orderRef: "SO-4" },
      { skuId: sku1.id, dealerId: dealer1.id, soldPrice: 105, qty: 2, dayOffset: 5, orderRef: "SO-5" },
      { skuId: sku2.id, dealerId: dealer1.id, soldPrice: 295, qty: 2, dayOffset: 6, orderRef: "SO-6" },
      { skuId: sku2.id, dealerId: dealer2.id, soldPrice: 285, qty: 2, dayOffset: 7, orderRef: "SO-7" },
      { skuId: sku2.id, dealerId: dealer1.id, soldPrice: 320, qty: 3, dayOffset: 8, orderRef: "SO-8" },
      { skuId: sku2.id, dealerId: dealer2.id, soldPrice: 299, qty: 2, dayOffset: 9, orderRef: "SO-9" },
      { skuId: sku2.id, dealerId: dealer1.id, soldPrice: 315, qty: 1, dayOffset: 10, orderRef: "SO-10" },
      { skuId: sku3.id, dealerId: dealer1.id, soldPrice: 1500, qty: 1, dayOffset: 11, orderRef: "SO-11" },
      { skuId: sku3.id, dealerId: dealer2.id, soldPrice: 1580, qty: 1, dayOffset: 12, orderRef: "SO-12" },
      { skuId: sku3.id, dealerId: dealer1.id, soldPrice: 1650, qty: 1, dayOffset: 13, orderRef: "SO-13" },
      { skuId: sku3.id, dealerId: dealer2.id, soldPrice: 1590, qty: 2, dayOffset: 14, orderRef: "SO-14" },
      { skuId: sku3.id, dealerId: dealer1.id, soldPrice: 1700, qty: 1, dayOffset: 15, orderRef: "SO-15" }
    ];

    await prisma.saleRow.createMany({
      data: sales.map((r) => ({
        tenantId: tenant.id,
        skuId: r.skuId,
        dealerId: r.dealerId,
        soldPrice: r.soldPrice,
        qty: r.qty,
        soldAt: new Date(now.getTime() - r.dayOffset * 86400000),
        orderRef: r.orderRef,
      })),
    });

    const snaps: Array<{ skuId: string; price: number; dayOffset: number; url: string }> = [
      { skuId: sku1.id, price: 92, dayOffset: 1, url: "https://example.com/1" },
      { skuId: sku1.id, price: 90, dayOffset: 2, url: "https://example.com/2" },
      { skuId: sku1.id, price: 98, dayOffset: 3, url: "https://example.com/3" },
      { skuId: sku1.id, price: 88, dayOffset: 4, url: "https://example.com/4" },
      { skuId: sku1.id, price: 101, dayOffset: 5, url: "https://example.com/5" },
      { skuId: sku2.id, price: 294, dayOffset: 1, url: "https://example.com/6" },
      { skuId: sku2.id, price: 280, dayOffset: 2, url: "https://example.com/7" },
      { skuId: sku2.id, price: 289, dayOffset: 3, url: "https://example.com/8" },
      { skuId: sku2.id, price: 310, dayOffset: 4, url: "https://example.com/9" },
      { skuId: sku2.id, price: 287, dayOffset: 5, url: "https://example.com/10" },
      { skuId: sku3.id, price: 1588, dayOffset: 1, url: "https://example.com/11" },
      { skuId: sku3.id, price: 1500, dayOffset: 2, url: "https://example.com/12" },
      { skuId: sku3.id, price: 1495, dayOffset: 3, url: "https://example.com/13" },
      { skuId: sku3.id, price: 1620, dayOffset: 4, url: "https://example.com/14" },
      { skuId: sku3.id, price: 1510, dayOffset: 5, url: "https://example.com/15" }
    ];

    await prisma.competitorSnapshot.createMany({
      data: snaps.map((s) => ({
        tenantId: tenant.id,
        competitorId: competitor.id,
        skuId: s.skuId,
        price: s.price,
        capturedAt: new Date(now.getTime() - s.dayOffset * 86400000),
        url: s.url,
      })),
    });

    const createdAlerts = await generateAlertsForTenant(tenant.id);

    return {
      ok: true,
      tenantId: tenant.id,
      seeded: { skus: 3, dealers: 2, competitor: 1, sales: 15, snapshots: 15, alertsCreated: createdAlerts },
      credentials: users.map((u) => ({ email: u.email, password: "password123", role: u.role })),
    };
  }
}
