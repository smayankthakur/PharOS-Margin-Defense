import { Body, Controller, Get, Post } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { DealerSchema } from "@pharos/shared";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("dealers")
export class DealersController {
  @Get()
  @Roles(Role.OWNER, Role.SALES, Role.OPS, Role.VIEWER)
  async list(@CurrentUser() user: { tenantId: string }) {
    return prisma.dealer.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } });
  }

  @Post()
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async create(@CurrentUser() user: { tenantId: string }, @Body(new ZodValidationPipe(DealerSchema)) body: { name: string; channel: string }) {
    return prisma.dealer.create({ data: { ...body, tenantId: user.tenantId } });
  }
}
