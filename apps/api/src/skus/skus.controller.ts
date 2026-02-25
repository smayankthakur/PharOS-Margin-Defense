import { Body, Controller, Get, Post } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { SkuSchema } from "@pharos/shared";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("skus")
export class SkusController {
  @Get()
  @Roles(Role.OWNER, Role.SALES, Role.OPS, Role.VIEWER)
  async list(@CurrentUser() user: { tenantId: string }) {
    return prisma.sku.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } });
  }

  @Post()
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(SkuSchema)) body: { skuCode: string; name: string; mrp: number; map: number; cost: number; onHandQty: number },
  ) {
    return prisma.sku.create({ data: { ...body, tenantId: user.tenantId } });
  }
}
