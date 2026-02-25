import { Body, Controller, Get, Post } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

const CompetitorSchema = z.object({ name: z.string().min(1) });

@Controller("competitors")
export class CompetitorsController {
  @Get()
  @Roles(Role.OWNER, Role.SALES, Role.OPS, Role.VIEWER)
  async list(@CurrentUser() user: { tenantId: string }) {
    return prisma.competitor.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } });
  }

  @Post()
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(CompetitorSchema)) body: { name: string },
  ) {
    return prisma.competitor.create({ data: { name: body.name, tenantId: user.tenantId } });
  }
}
