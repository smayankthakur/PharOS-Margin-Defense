import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { AlertStatusSchema } from "@pharos/shared";
import { z } from "zod";
import { CurrentUser } from "@/common/current-user";
import { Roles } from "@/common/roles.decorator";
import { ZodValidationPipe } from "@/common/zod.pipe";
import { assertTenantOwned } from "./utils";

@Controller("alerts")
export class AlertsController {
  @Get()
  @Roles(Role.OWNER, Role.OPS, Role.SALES, Role.VIEWER)
  list(
    @CurrentUser() user: { tenantId: string },
    @Query("status") status?: "OPEN" | "ACK" | "RESOLVED",
    @Query("type") type?: "MAP" | "MRP" | "UNDERCUT" | "DEAD_STOCK",
    @Query("severity") severity?: "LOW" | "MED" | "HIGH",
    @Query("q") q?: string,
    @Query("range") range?: "7d" | "30d",
  ) {
    const days = range === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const base = {
      tenantId: user.tenantId,
      createdAt: { gte: since },
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(severity ? { severity } : {}),
    };
    const where = q
      ? {
          ...base,
          OR: [
            { sku: { skuCode: { contains: q, mode: "insensitive" as const } } },
            { sku: { name: { contains: q, mode: "insensitive" as const } } },
            { dealer: { name: { contains: q, mode: "insensitive" as const } } },
            { competitor: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : base;

    return prisma.alert.findMany({
      where,
      include: { sku: true, dealer: true, competitor: true },
      orderBy: { createdAt: "desc" },
    });
  }

  @Get(":id")
  @Roles(Role.OWNER, Role.OPS, Role.SALES, Role.VIEWER)
  async detail(@CurrentUser() user: { tenantId: string }, @Param("id") id: string) {
    const alert = assertTenantOwned(
      await prisma.alert.findFirst({
        where: { id, tenantId: user.tenantId },
        include: { sku: true, dealer: true, competitor: true },
      }),
    );

    const taskHistory = await prisma.task.findMany({
      where: { tenantId: user.tenantId, alertId: id },
      orderBy: { createdAt: "asc" },
    });

    return {
      ...alert,
      ruleTriggered: alert.type,
      mathBreakdown: alert.evidenceJson,
      timeline: [
        { at: alert.createdAt, event: "alert_created" },
        ...taskHistory.map((t: { createdAt: Date; status: string }) => ({
          at: t.createdAt,
          event: `task_${t.status.toLowerCase()}`,
        })),
      ],
      linkedEvidence: alert.evidenceJson,
      taskHistory,
    };
  }

  @Patch(":id")
  @Roles(Role.OWNER, Role.OPS, Role.SALES)
  async updateStatus(
    @CurrentUser() user: { tenantId: string },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(z.object({ status: AlertStatusSchema })))
    statusBody: { status: "OPEN" | "ACK" | "RESOLVED" },
  ) {
    assertTenantOwned(await prisma.alert.findFirst({ where: { id, tenantId: user.tenantId } }));
    return prisma.alert.update({ where: { id }, data: { status: statusBody.status } });
  }
}
