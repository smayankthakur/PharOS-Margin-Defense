import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { TaskCreateSchema } from "@pharos/shared";
import { CurrentUser } from "@/common/current-user";
import { Roles } from "@/common/roles.decorator";
import { ZodValidationPipe } from "@/common/zod.pipe";
import { assertTenantOwned } from "./utils";

@Controller("tasks")
export class TasksController {
  @Get()
  @Roles(Role.OWNER, Role.OPS, Role.SALES, Role.VIEWER)
  list(@CurrentUser() user: { tenantId: string; userId: string }, @Query("mine") mine?: string) {
    const where = mine === "true" ? { tenantId: user.tenantId, assigneeUserId: user.userId } : { tenantId: user.tenantId };
    return prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { alert: true },
    });
  }

  @Post()
  @Roles(Role.OWNER, Role.OPS, Role.SALES)
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(TaskCreateSchema)) body: { alertId?: string; title: string; slaDueAt: Date; assigneeUserId?: string },
  ) {
    if (body.alertId) {
      assertTenantOwned(await prisma.alert.findFirst({ where: { id: body.alertId, tenantId: user.tenantId } }));
    }
    if (body.assigneeUserId) {
      assertTenantOwned(await prisma.user.findFirst({ where: { id: body.assigneeUserId, tenantId: user.tenantId } }));
    }

    return prisma.task.create({
      data: {
        tenantId: user.tenantId,
        alertId: body.alertId ?? null,
        title: body.title,
        slaDueAt: body.slaDueAt,
        assigneeUserId: body.assigneeUserId ?? null,
      },
    });
  }

  @Patch(":id")
  @Roles(Role.OWNER, Role.OPS, Role.SALES)
  async update(
    @CurrentUser() user: { tenantId: string },
    @Param("id") id: string,
    @Body()
    body: Partial<{ title: string; slaDueAt: Date; assigneeUserId: string; status: "OPEN" | "IN_PROGRESS" | "DONE" }>,
  ) {
    assertTenantOwned(await prisma.task.findFirst({ where: { id, tenantId: user.tenantId } }));
    if (body.assigneeUserId) {
      assertTenantOwned(await prisma.user.findFirst({ where: { id: body.assigneeUserId, tenantId: user.tenantId } }));
    }
    return prisma.task.update({ where: { id }, data: body });
  }
}
