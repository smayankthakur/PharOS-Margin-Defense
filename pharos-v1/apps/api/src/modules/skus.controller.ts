import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { SkuCreateSchema } from "@pharos/shared";
import { CurrentUser } from "@/common/current-user";
import { Roles } from "@/common/roles.decorator";
import { ZodValidationPipe } from "@/common/zod.pipe";
import { assertTenantOwned } from "./utils";

@Controller("skus")
export class SkusController {
  @Get()
  @Roles(Role.OWNER, Role.OPS, Role.SALES, Role.VIEWER)
  list(@CurrentUser() user: { tenantId: string }, @Query("q") q?: string) {
    const where = q
      ? {
          tenantId: user.tenantId,
          OR: [
            { skuCode: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : { tenantId: user.tenantId };
    return prisma.sku.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  @Roles(Role.OWNER, Role.OPS)
  create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(SkuCreateSchema)) body: {
      skuCode: string;
      name: string;
      mrp: number;
      map: number;
      cost: number;
      onHandQty: number;
    },
  ) {
    return prisma.sku.create({ data: { ...body, tenantId: user.tenantId } });
  }

  @Patch(":id")
  @Roles(Role.OWNER, Role.OPS, Role.SALES)
  async update(
    @CurrentUser() user: { tenantId: string },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SkuCreateSchema.partial())) body: Partial<{
      skuCode: string;
      name: string;
      mrp: number;
      map: number;
      cost: number;
      onHandQty: number;
    }>,
  ) {
    const found = await prisma.sku.findFirst({ where: { id, tenantId: user.tenantId } });
    assertTenantOwned(found);
    if (Object.keys(body).length === 0) throw new BadRequestException("No update payload");
    return prisma.sku.update({ where: { id }, data: body });
  }

  @Delete(":id")
  @Roles(Role.OWNER, Role.OPS)
  async remove(@CurrentUser() user: { tenantId: string }, @Param("id") id: string) {
    const found = await prisma.sku.findFirst({ where: { id, tenantId: user.tenantId } });
    assertTenantOwned(found);
    await prisma.sku.delete({ where: { id } });
    return { ok: true };
  }
}
