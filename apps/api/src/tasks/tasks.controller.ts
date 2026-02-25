import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { TaskSchema } from "@pharos/shared";
import { PinoLogger } from "nestjs-pino";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("tasks")
export class TasksController {
  constructor(private readonly logger: PinoLogger) {}

  @Get()
  @Roles(Role.OWNER, Role.SALES, Role.OPS, Role.VIEWER)
  async list(@CurrentUser() user: { tenantId: string; userId: string; role: string }) {
    return prisma.task.findMany({
      where: user.role === "VIEWER" ? { tenantId: user.tenantId, assigneeUserId: user.userId } : { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(TaskSchema)) body: { alertId?: string; title: string; slaDueAt?: Date; assigneeUserId?: string },
  ) {
    if (body.alertId) {
      const alert = await prisma.alert.findFirst({ where: { id: body.alertId, tenantId: user.tenantId } });
      if (!alert) throw new BadRequestException("Invalid alertId for tenant");
    }
    if (body.assigneeUserId) {
      const assignee = await prisma.user.findFirst({ where: { id: body.assigneeUserId, tenantId: user.tenantId } });
      if (!assignee) throw new BadRequestException("Invalid assigneeUserId for tenant");
    }

    const created = await prisma.task.create({
      data: {
        tenantId: user.tenantId,
        title: body.title,
        alertId: body.alertId,
        slaDueAt: body.slaDueAt,
        assigneeUserId: body.assigneeUserId,
      },
    });
    this.logger.info({ audit: true, action: "task.create", taskId: created.id, tenantId: user.tenantId });
    return created;
  }

  @Patch(":id")
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async patch(
    @CurrentUser() user: { tenantId: string },
    @Param("id") id: string,
    @Body() body: { status?: "OPEN" | "IN_PROGRESS" | "DONE"; title?: string; slaDueAt?: Date | null },
  ) {
    const existing = await prisma.task.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!existing) throw new ForbiddenException("Task not found for tenant");
    const updated = await prisma.task.update({
      where: { id },
      data: { status: body.status, title: body.title, slaDueAt: body.slaDueAt },
    });
    this.logger.info({ audit: true, action: "task.patch", taskId: id, tenantId: user.tenantId });
    return updated;
  }
}
