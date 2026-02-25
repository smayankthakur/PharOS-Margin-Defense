import { Body, Controller, ForbiddenException, Get, Param, Patch, Query } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { PinoLogger } from "nestjs-pino";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly logger: PinoLogger) {}

  @Get()
  @Roles(Role.OWNER, Role.SALES, Role.OPS, Role.VIEWER)
  async list(
    @CurrentUser() user: { tenantId: string },
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("severity") severity?: string,
    @Query("q") q?: string,
  ) {
    return prisma.alert.findMany({
      where: {
        tenantId: user.tenantId,
        status: status as any,
        type: type as any,
        severity: severity as any,
        OR: q
          ? [
              { skuId: { contains: q, mode: "insensitive" } },
              { dealerId: { contains: q, mode: "insensitive" } },
              { competitorId: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  @Get(":id")
  @Roles(Role.OWNER, Role.SALES, Role.OPS, Role.VIEWER)
  async detail(@CurrentUser() user: { tenantId: string }, @Param("id") id: string) {
    const alert = await prisma.alert.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!alert) throw new ForbiddenException("Alert not found for tenant");
    const tasks = await prisma.task.findMany({ where: { tenantId: user.tenantId, alertId: id }, orderBy: { createdAt: "desc" } });
    return { ...alert, tasks };
  }

  @Patch(":id")
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async updateStatus(
    @CurrentUser() user: { tenantId: string },
    @Param("id") id: string,
    @Body() body: { status?: "OPEN" | "ACK" | "RESOLVED" },
  ) {
    const existing = await prisma.alert.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!existing) throw new ForbiddenException("Alert not found for tenant");
    const updated = await prisma.alert.update({
      where: { id },
      data: { status: body.status },
    });
    this.logger.info({ audit: true, action: "alert.patch", alertId: id, tenantId: user.tenantId });
    return updated;
  }
}
